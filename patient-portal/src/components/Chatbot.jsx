import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.jsx'
import { Button } from './ui/button.jsx'
import { Input } from './ui/input.jsx'
import { Badge } from './ui/badge.jsx'
import { Loader2, Send, Bot, User } from 'lucide-react'
import { Alert, AlertDescription } from './ui/alert.jsx'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export const Chatbot = ({ onComplete }) => {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [currentStep, setCurrentStep] = useState('start')
  const [sessionData, setSessionData] = useState({})
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)
  const scrollRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    startSession()
  }, [])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const startSession = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Try to start session with backend
      try {
        const response = await fetch(`${API_URL}/api/chatbot/start-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (response.ok) {
          const data = await response.json()
          setSessionId(data.session_id)
          setCurrentStep(data.current_step || 'start')

          // Add welcome message from backend
          setMessages([
            {
              id: '1',
              text: data.message || data.next_question?.question || "Hello! I'm here to help assess your symptoms. Do you currently have a fever?",
              sender: 'bot',
              timestamp: new Date(),
              question: data.next_question || data.question,
            },
          ])
          setLoading(false)
          return
        }
      } catch (fetchErr) {
        console.warn('Backend not available, using local mode:', fetchErr)
      }

      // Fallback: Start session locally without backend
      const localSessionId = `local-${Date.now()}`
      setSessionId(localSessionId)
      setCurrentStep('start')

      // Add welcome message
      setMessages([
        {
          id: '1',
          text: "Hello! I'm here to help assess your symptoms. Do you currently have a fever?",
          sender: 'bot',
          timestamp: new Date(),
          question: {
            type: 'yes_no',
            key: 'has_fever',
            question: "Do you currently have a fever?",
            options: ['Yes', 'No']
          },
        },
      ])
    } catch (err) {
      console.error('Error starting session:', err)
      // Still show welcome message even on error
      setMessages([
        {
          id: '1',
          text: "Hello! I'm here to help assess your symptoms. Do you currently have a fever?",
          sender: 'bot',
          timestamp: new Date(),
          question: {
            type: 'yes_no',
            key: 'has_fever',
            question: "Do you currently have a fever?",
            options: ['Yes', 'No']
          },
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async (text) => {
    if (!text.trim() || loading || completed) return

    const userMessage = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setError(null)

    // Check if using local mode (session ID starts with 'local-')
    const isLocalMode = sessionId && sessionId.startsWith('local-')

    if (isLocalMode) {
      // Local mode: Simple rule-based responses
      handleLocalResponse(text.trim())
      setLoading(false)
      return
    }

    // Try backend API
    try {
      const response = await fetch(`${API_URL}/api/chatbot/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          message: text.trim(),
        }),
      })

      if (response.ok) {
        const data = await response.json()

        // Update session data
        if (data.session_data) {
          setSessionData((prev) => ({ ...prev, ...data.session_data }))
        }

        // Add bot response
        const botMessage = {
          id: (Date.now() + 1).toString(),
          text: data.message || data.response || 'Thank you for your response.',
          sender: 'bot',
          timestamp: new Date(),
          question: data.next_question || data.question,
          analysis: data.analysis,
        }

        setMessages((prev) => [...prev, botMessage])

        // Check if assessment is complete
        if (data.completed || data.analysis) {
          setCompleted(true)
          if (onComplete && data.analysis) {
            onComplete(data.analysis)
          }

          // Submit report if analysis is available
          if (data.analysis && sessionId) {
            try {
              await fetch(`${API_URL}/api/chatbot/submit-report`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  session_id: sessionId,
                  analysis: data.analysis,
                }),
              })
            } catch (err) {
              console.error('Error submitting report:', err)
            }
          }
        } else if (data.next_step) {
          setCurrentStep(data.next_step)
        }
        setLoading(false)
        return
      }
    } catch (err) {
      console.warn('Backend not available, using local mode:', err)
    }

    // Fallback to local mode
    handleLocalResponse(text.trim())
    setLoading(false)
  }

  const handleLocalResponse = (text) => {
    const lowerText = text.toLowerCase()
    const currentData = sessionData[currentStep] || {}

    // Simple rule-based chatbot logic
    if (currentStep === 'start' || currentStep === 'has_fever') {
      if (lowerText.includes('yes') || lowerText.includes('yep') || lowerText === 'y') {
        setSessionData({ ...sessionData, has_fever: true })
        setCurrentStep('fever_duration')
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: 'How long have you had the fever?',
            sender: 'bot',
            timestamp: new Date(),
            question: {
              type: 'choice',
              key: 'fever_duration',
              options: ['Less than 1 day', '1-3 days', '4-7 days', 'More than 7 days'],
            },
          },
        ])
      } else if (lowerText.includes('no') || lowerText.includes('nope') || lowerText === 'n') {
        setSessionData({ ...sessionData, has_fever: false })
        setCurrentStep('other_symptoms')
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: 'Do you have any other symptoms like headache, body ache, or fatigue?',
            sender: 'bot',
            timestamp: new Date(),
            question: {
              type: 'yes_no',
              key: 'other_symptoms',
            },
          },
        ])
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: 'Please answer with Yes or No.',
            sender: 'bot',
            timestamp: new Date(),
          },
        ])
      }
    } else if (currentStep === 'fever_duration') {
      setSessionData({ ...sessionData, fever_duration: text })
      setCurrentStep('temperature')
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: 'What is your current body temperature? (in Celsius)',
          sender: 'bot',
          timestamp: new Date(),
        },
      ])
    } else if (currentStep === 'temperature') {
      const temp = parseFloat(text)
      if (!isNaN(temp)) {
        setSessionData({ ...sessionData, temperature: temp })
        setCurrentStep('complete')
        // Generate simple analysis
        const riskScore = temp > 39 ? 75 : temp > 38 ? 50 : 30
        const riskLevel = riskScore > 70 ? 'high' : riskScore > 50 ? 'medium' : 'low'
        const analysis = {
          risk_score: riskScore,
          risk_level: riskLevel,
          suspected_fever_type: 'Viral Fever',
          recommendation: riskLevel === 'high' 
            ? 'Please consult a doctor immediately. Your temperature is high and requires medical attention.'
            : riskLevel === 'medium'
            ? 'Monitor your symptoms and consider consulting a doctor if they worsen.'
            : 'Rest and stay hydrated. Monitor your symptoms.',
        }
        setCompleted(true)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: `Based on your symptoms, your risk level is ${riskLevel.toUpperCase()}. ${analysis.recommendation}`,
            sender: 'bot',
            timestamp: new Date(),
            analysis: analysis,
          },
        ])
        if (onComplete) {
          onComplete(analysis)
        }
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: 'Please enter a valid temperature number.',
            sender: 'bot',
            timestamp: new Date(),
          },
        ])
      }
    } else if (currentStep === 'other_symptoms') {
      if (lowerText.includes('yes')) {
        setSessionData({ ...sessionData, other_symptoms: true })
        setCurrentStep('complete')
        const analysis = {
          risk_score: 40,
          risk_level: 'low',
          suspected_fever_type: 'General Symptoms',
          recommendation: 'Rest and stay hydrated. If symptoms persist, consider consulting a doctor.',
        }
        setCompleted(true)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: `Thank you for the information. ${analysis.recommendation}`,
            sender: 'bot',
            timestamp: new Date(),
            analysis: analysis,
          },
        ])
        if (onComplete) {
          onComplete(analysis)
        }
      } else {
        setSessionData({ ...sessionData, other_symptoms: false })
        setCurrentStep('complete')
        const analysis = {
          risk_score: 20,
          risk_level: 'low',
          suspected_fever_type: 'No Fever',
          recommendation: 'You appear to be in good health. Continue monitoring your symptoms.',
        }
        setCompleted(true)
        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            text: analysis.recommendation,
            sender: 'bot',
            timestamp: new Date(),
            analysis: analysis,
          },
        ])
        if (onComplete) {
          onComplete(analysis)
        }
      }
    }
  }

  const handleQuickReply = (reply) => {
    sendMessage(reply)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (input.trim()) {
      sendMessage(input)
    }
  }

  const handleRestart = () => {
    setMessages([])
    setSessionData({})
    setCompleted(false)
    setCurrentStep('start')
    setError(null)
    startSession()
  }

  return (
    <div className="flex flex-col h-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[400px] max-h-[600px]"
      >
        {messages.length === 0 && !loading && (
          <div className="text-center text-muted-foreground py-8">
            Starting chatbot session...
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex items-start gap-2 max-w-[80%] ${
                message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {message.sender === 'user' ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div
                className={`rounded-lg px-4 py-2 ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                {message.analysis && (
                  <div className="mt-2 pt-2 border-t border-border/50">
                    <p className="text-xs font-semibold mb-1">Assessment:</p>
                    {message.analysis.risk_level && (
                      <Badge
                        variant={
                          message.analysis.risk_level === 'high'
                            ? 'destructive'
                            : message.analysis.risk_level === 'medium'
                            ? 'default'
                            : 'secondary'
                        }
                        className="mr-2"
                      >
                        {message.analysis.risk_level.toUpperCase()} RISK
                      </Badge>
                    )}
                    {message.analysis.recommendation && (
                      <p className="text-xs mt-2">{message.analysis.recommendation}</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Thinking...</span>
            </div>
          </div>
        )}

        {completed && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-sm font-semibold text-green-800 mb-2">
              Assessment complete. Report has been saved.
            </p>
            <Button onClick={handleRestart} variant="outline" size="sm">
              Start New Assessment
            </Button>
          </div>
        )}
      </div>

      {!completed && messages.length > 0 && messages[messages.length - 1]?.question && (
        <div className="p-4 border-t space-y-2">
          <p className="text-xs text-muted-foreground mb-2">Quick replies:</p>
          <div className="flex flex-wrap gap-2">
            {messages[messages.length - 1].question.options?.map((option, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleQuickReply(option)}
                disabled={loading}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      )}

      {!completed && (
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer..."
              disabled={loading || completed}
              className="flex-1"
            />
            <Button type="submit" disabled={loading || completed || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}

export default Chatbot

