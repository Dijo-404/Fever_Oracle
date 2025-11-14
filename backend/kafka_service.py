"""
Kafka service for monitoring and real-time data access
"""

from flask import Blueprint, jsonify, request
from kafka import KafkaConsumer
from kafka.errors import KafkaError
import json
import threading
from datetime import datetime, timedelta
from collections import defaultdict
import os

kafka_bp = Blueprint('kafka', __name__)

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')

# In-memory stats (in production, use Redis or similar)
kafka_stats = {
    'topics': defaultdict(lambda: {
        'messages_per_minute': 0,
        'total_messages': 0,
        'last_message_time': None,
        'status': 'idle',
        'message_times': []  # Track message timestamps for rate calculation
    }),
    'total_throughput': 0,
    'consumer_lag': 0
}

def calculate_throughput():
    """Calculate messages per minute for each topic"""
    now = datetime.now()
    one_minute_ago = now - timedelta(minutes=1)
    
    for topic_name, stats in kafka_stats['topics'].items():
        # Filter messages from last minute
        stats['message_times'] = [
            t for t in stats['message_times'] 
            if t > one_minute_ago
        ]
        
        # Calculate messages per minute
        stats['messages_per_minute'] = len(stats['message_times'])
        
        # Determine status
        if stats['messages_per_minute'] > 0:
            stats['status'] = 'active'
        elif stats['last_message_time'] and (now - stats['last_message_time']).total_seconds() < 60:
            stats['status'] = 'active'
        else:
            stats['status'] = 'idle'
    
    kafka_stats['total_throughput'] = sum(
        s['messages_per_minute'] for s in kafka_stats['topics'].values()
    )

def start_kafka_monitor():
    """Start monitoring Kafka topics"""
    try:
        consumer = KafkaConsumer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='fever-oracle-monitor',
            consumer_timeout_ms=1000
        )
        
        topics = [
            'fever-oracle-wastewater',
            'fever-oracle-pharmacy',
            'fever-oracle-patients',
            'fever-oracle-vitals',
            'fever-oracle-alerts',
            'fever-oracle-outbreak'
        ]
        
        consumer.subscribe(topics)
        
        def consume():
            try:
                for message in consumer:
                    topic = message.topic
                    now = datetime.now()
                    
                    kafka_stats['topics'][topic]['total_messages'] += 1
                    kafka_stats['topics'][topic]['last_message_time'] = now
                    kafka_stats['topics'][topic]['message_times'].append(now)
                    
                    # Keep only last 100 timestamps
                    if len(kafka_stats['topics'][topic]['message_times']) > 100:
                        kafka_stats['topics'][topic]['message_times'] = \
                            kafka_stats['topics'][topic]['message_times'][-100:]
                    
                    calculate_throughput()
            except Exception as e:
                print(f"Error in Kafka monitor: {e}")
            finally:
                consumer.close()
        
        thread = threading.Thread(target=consume, daemon=True)
        thread.start()
        print("Kafka monitor started")
    except Exception as e:
        print(f"Warning: Could not start Kafka monitor: {e}")

@kafka_bp.route('/api/kafka/stats', methods=['GET'])
def get_kafka_stats():
    """Get Kafka statistics"""
    try:
        calculate_throughput()
        # Return empty stats if no topics have been seen yet
        topics_list = [
            {
                'name': name,
                'messages_per_minute': stats['messages_per_minute'],
                'total_messages': stats['total_messages'],
                'status': stats['status']
            }
            for name, stats in kafka_stats['topics'].items()
        ]
        
        # If no topics, return default structure
        if not topics_list:
            topics_list = [
                {'name': 'fever-oracle-wastewater', 'messages_per_minute': 0, 'total_messages': 0, 'status': 'idle'},
                {'name': 'fever-oracle-pharmacy', 'messages_per_minute': 0, 'total_messages': 0, 'status': 'idle'},
                {'name': 'fever-oracle-patients', 'messages_per_minute': 0, 'total_messages': 0, 'status': 'idle'},
                {'name': 'fever-oracle-vitals', 'messages_per_minute': 0, 'total_messages': 0, 'status': 'idle'},
                {'name': 'fever-oracle-alerts', 'messages_per_minute': 0, 'total_messages': 0, 'status': 'idle'},
                {'name': 'fever-oracle-outbreak', 'messages_per_minute': 0, 'total_messages': 0, 'status': 'idle'},
            ]
        
        return jsonify({
            'topics': topics_list,
            'total_throughput': kafka_stats['total_throughput'],
            'consumer_lag': kafka_stats['consumer_lag']
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500

@kafka_bp.route('/api/kafka/latest-data', methods=['GET'])
def get_latest_kafka_data():
    """Get latest data from Kafka topics"""
    try:
        consumer = None
        try:
            consumer = KafkaConsumer(
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                value_deserializer=lambda m: json.loads(m.decode('utf-8')),
                auto_offset_reset='latest',
                consumer_timeout_ms=2000,
                enable_auto_commit=False,
                api_version=(0, 10, 1)
            )
            
            topics_param = request.args.get('topics', 'wastewater,pharmacy')
            topics_list = [t.strip() for t in topics_param.split(',')]
            
            topic_map = {
                'wastewater': 'fever-oracle-wastewater',
                'pharmacy': 'fever-oracle-pharmacy',
                'patients': 'fever-oracle-patients',
                'vitals': 'fever-oracle-vitals',
                'alerts': 'fever-oracle-alerts',
                'outbreak': 'fever-oracle-outbreak'
            }
            
            subscribed_topics = [topic_map.get(t, f'fever-oracle-{t}') for t in topics_list]
            consumer.subscribe(subscribed_topics)
            
            latest_data = {}
            message_count = 0
            max_messages = 20  # Get up to 20 messages per topic
            
            try:
                for message in consumer:
                    topic = message.topic.replace('fever-oracle-', '')
                    if topic not in latest_data:
                        latest_data[topic] = []
                    latest_data[topic].append(message.value)
                    message_count += 1
                    if message_count >= max_messages * len(subscribed_topics):
                        break
            except Exception as e:
                # Timeout is expected when no new messages
                pass
        except KafkaError as e:
            # Kafka connection error - return empty data
            return jsonify({
                'data': {},
                'count': 0,
                'timestamp': datetime.now().isoformat(),
                'error': f'Kafka connection error: {str(e)}',
                'message': 'Kafka may not be running. Please start Kafka and the producer.'
            })
        finally:
            if consumer:
                try:
                    consumer.close()
                except:
                    pass
        
        return jsonify({
            'data': latest_data,
            'count': message_count,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e), "message": "Failed to fetch Kafka data"}), 500

# Start monitoring when module is imported
try:
    start_kafka_monitor()
except Exception as e:
    print(f"Warning: Could not start Kafka monitor: {e}")

