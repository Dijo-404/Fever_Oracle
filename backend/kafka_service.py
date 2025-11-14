"""
Kafka service for monitoring and real-time data access
"""

from flask import Blueprint, jsonify, request
from functools import lru_cache
import json
import threading
from datetime import datetime, timedelta
from collections import defaultdict
import os
from pathlib import Path

# Try to import Kafka, but handle gracefully if not available
try:
    from kafka import KafkaConsumer
    from kafka.errors import KafkaError
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False
    print("Warning: kafka-python not installed. Kafka features will be limited.")

kafka_bp = Blueprint('kafka', __name__)

# Kafka configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092')

# Load Kafka topics configuration
CONFIG_DIR = Path(__file__).parent / "config"
KAFKA_CONFIG_FILE = CONFIG_DIR / "kafka_topics.json"

@lru_cache(maxsize=1)
def load_kafka_config():
    """Load Kafka topics configuration"""
    try:
        if KAFKA_CONFIG_FILE.exists():
            with open(KAFKA_CONFIG_FILE, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Warning: Could not load Kafka config: {e}")
    return {
        "topics": [
            {"name": "fever-oracle-wastewater"},
            {"name": "fever-oracle-pharmacy"},
            {"name": "fever-oracle-patients"},
            {"name": "fever-oracle-vitals"},
            {"name": "fever-oracle-alerts"},
            {"name": "fever-oracle-outbreak"}
        ]
    }

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
    if not KAFKA_AVAILABLE:
        print("Warning: Kafka not available, monitor not started")
        return
    
    try:
        consumer = KafkaConsumer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            auto_offset_reset='latest',
            enable_auto_commit=True,
            group_id='fever-oracle-monitor',
            consumer_timeout_ms=1000,
            api_version=(0, 10, 1)
        )
        
        config = load_kafka_config()
        topics = [topic['name'] for topic in config.get('topics', [])]
        
        if not topics:
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
                try:
                    consumer.close()
                except:
                    pass
        
        thread = threading.Thread(target=consume, daemon=True)
        thread.start()
        print("Kafka monitor started")
    except Exception as e:
        print(f"Warning: Could not start Kafka monitor: {e}")

@kafka_bp.route('/api/kafka/stats', methods=['GET'])
def get_kafka_stats():
    """Get Kafka statistics with mock data fallback - always returns JSON"""
    try:
        calculate_throughput()
        
        # Get default topics from config
        config = load_kafka_config()
        default_topics = [topic['name'] for topic in config.get('topics', [])]
        
        if not default_topics:
            default_topics = [
                'fever-oracle-wastewater',
                'fever-oracle-pharmacy',
                'fever-oracle-patients',
                'fever-oracle-vitals',
                'fever-oracle-alerts',
                'fever-oracle-outbreak'
            ]
        
        # Build topics list with stats
        topics_dict = {name: kafka_stats['topics'][name] for name in default_topics}
        topics_list = [
            {
                'name': name,
                'messages_per_minute': stats['messages_per_minute'],
                'total_messages': stats['total_messages'],
                'status': stats['status']
            }
            for name, stats in topics_dict.items()
        ]
        
        # Ensure all default topics are included
        existing_names = {t['name'] for t in topics_list}
        for topic_name in default_topics:
            if topic_name not in existing_names:
                topics_list.append({
                    'name': topic_name,
                    'messages_per_minute': 0,
                    'total_messages': 0,
                    'status': 'idle'
                })
        
        # If no real data, provide mock data for demonstration
        if kafka_stats['total_throughput'] == 0 and not KAFKA_AVAILABLE:
            # Generate mock statistics for demo
            import random
            mock_throughput = random.randint(5, 15)
            for topic in topics_list:
                if topic['total_messages'] == 0:
                    topic['messages_per_minute'] = random.randint(0, 3)
                    topic['total_messages'] = random.randint(10, 100)
                    topic['status'] = 'active' if topic['messages_per_minute'] > 0 else 'idle'
            kafka_stats['total_throughput'] = sum(t['messages_per_minute'] for t in topics_list)
        
        return jsonify({
            'topics': topics_list,
            'total_throughput': kafka_stats['total_throughput'],
            'consumer_lag': kafka_stats['consumer_lag'],
            'kafka_available': KAFKA_AVAILABLE,
            'bootstrap_servers': KAFKA_BOOTSTRAP_SERVERS,
            'mode': 'mock' if not KAFKA_AVAILABLE else 'live'
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Return mock data on error
        mock_topics = [
            {'name': 'fever-oracle-wastewater', 'messages_per_minute': 2, 'total_messages': 45, 'status': 'active'},
            {'name': 'fever-oracle-pharmacy', 'messages_per_minute': 3, 'total_messages': 67, 'status': 'active'},
            {'name': 'fever-oracle-patients', 'messages_per_minute': 1, 'total_messages': 23, 'status': 'active'},
            {'name': 'fever-oracle-vitals', 'messages_per_minute': 4, 'total_messages': 89, 'status': 'active'},
            {'name': 'fever-oracle-alerts', 'messages_per_minute': 0, 'total_messages': 12, 'status': 'idle'},
            {'name': 'fever-oracle-outbreak', 'messages_per_minute': 1, 'total_messages': 34, 'status': 'active'},
        ]
        return jsonify({
            "topics": mock_topics,
            "total_throughput": 11,
            "consumer_lag": 0,
            "kafka_available": KAFKA_AVAILABLE,
            "mode": "mock",
            "error": str(e)
        }), 200  # Return 200 with mock data

@kafka_bp.route('/api/kafka/latest-data', methods=['GET'])
def get_latest_kafka_data():
    """Get latest data from Kafka topics with mock data fallback - always returns JSON"""
    # Generate mock data if Kafka is not available
    if not KAFKA_AVAILABLE:
        return _get_mock_kafka_data()
    
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
            # Kafka connection error - return mock data
            return _get_mock_kafka_data()
        except Exception as e:
            # On any error, return mock data
            return _get_mock_kafka_data()
        finally:
            if consumer:
                try:
                    consumer.close()
                except:
                    pass
        
        return jsonify({
            'data': latest_data,
            'count': message_count,
            'timestamp': datetime.now().isoformat(),
            'kafka_available': True
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        # On final error, return mock data
        return _get_mock_kafka_data()

def _get_mock_kafka_data():
    """Generate mock Kafka data for demonstration - always returns JSON"""
    try:
        import random
        now = datetime.now()
        
        mock_data = {
            'wastewater': [
                {
                    'timestamp': (now - timedelta(minutes=random.randint(1, 10))).isoformat(),
                    'region': random.choice(['Northeast', 'Central', 'West']),
                    'viral_load': round(45 + random.uniform(-10, 15), 2),
                    'threshold': 70.0,
                    'sample_location': f"Treatment_Plant_{random.randint(1, 3)}"
                }
                for _ in range(random.randint(1, 3))
            ],
            'pharmacy': [
                {
                    'timestamp': (now - timedelta(minutes=random.randint(1, 10))).isoformat(),
                    'region': random.choice(['Northeast', 'Central', 'West']),
                    'sales_index': round(75 + random.uniform(-15, 20), 2),
                    'baseline': 85.0,
                    'pharmacy_chain': random.choice(['CVS', 'Walgreens', 'Rite Aid'])
                }
                for _ in range(random.randint(1, 3))
            ],
            'alerts': [
                {
                    'id': f"ALERT-{random.randint(100, 999)}",
                    'severity': random.choice(['high', 'medium', 'low']),
                    'region': f"{random.choice(['Northeast', 'Central', 'West'])} District",
                    'message': 'Elevated fever cases detected',
                    'timestamp': (now - timedelta(hours=random.randint(1, 5))).isoformat(),
                    'source': random.choice(['Federated Learning', 'Wastewater Analysis']),
                    'confidence': random.randint(75, 95)
                }
                for _ in range(random.randint(0, 2))
            ],
            'vitals': [
                {
                    'patient_id': f"PT-{random.randint(2000, 9999)}",
                    'timestamp': (now - timedelta(minutes=random.randint(1, 30))).isoformat(),
                    'temperature': round(36.5 + random.uniform(-0.5, 2.0), 1),
                    'heart_rate': random.randint(65, 95),
                    'blood_pressure_systolic': random.randint(110, 130)
                }
                for _ in range(random.randint(1, 2))
            ]
        }
        
        total_count = sum(len(v) for v in mock_data.values())
        
        return jsonify({
            'data': mock_data,
            'count': total_count,
            'timestamp': now.isoformat(),
            'kafka_available': KAFKA_AVAILABLE,
            'mode': 'mock'
        })
    except Exception as e:
        # Even on error, return JSON
        return jsonify({
            'data': {},
            'count': 0,
            'timestamp': datetime.now().isoformat(),
            'kafka_available': KAFKA_AVAILABLE,
            'mode': 'mock',
            'error': str(e)
        })

# Start monitoring when module is imported
try:
    start_kafka_monitor()
except Exception as e:
    print(f"Warning: Could not start Kafka monitor: {e}")

