import { useState, useEffect } from 'react'
import mqtt from 'mqtt'
import './App.css' // 默认的 CSS 即可，我们加点简单的内联样式

interface UserPayload {
  user: string;
  status: 'online' | 'afk' | 'offline';
  active_app?: string;
  window_title?: string;
}

function App() {
  // 使用一个对象来存储所有连上来的用户状态，Key 是用户名
  const [users, setUsers] = useState<Record<string, UserPayload>>({})
  const [connectionStatus, setConnectionStatus] = useState('Connecting...')

  useEffect(() => {
    // 从环境变量读取配置
    const brokerUrl = import.meta.env.VITE_MQTT_BROKER
    const baseTopic = import.meta.env.VITE_ROOM_TOPIC

    const roomTopic = `${baseTopic}/#`

    // 连接公共 Broker
    const client = mqtt.connect(brokerUrl)

    client.on('connect', () => {
      setConnectionStatus('Connected to Broker 🟢')
      // 订阅房间话题
      client.subscribe(roomTopic, (err) => {
        if (!err) console.log(`Subscribed to ${roomTopic}`)
      })
    })

    // 监听消息（包括历史保留消息和实时新消息）
    client.on('message', (topic, message) => {
      try {
        console.log(`[新消息] 来自 Topic: ${topic}`)
        const payload = JSON.parse(message.toString()) as UserPayload;

        // 核心：动态更新用户状态字典
        // 假设 payload 格式为: { user: "Cloyd", status: "online", active_app: "Code.exe", window_title: "App.jsx" }
        if (payload.user) {
          setUsers(prevUsers => ({
            ...prevUsers,
            [payload.user]: payload
          }))
        }
      } catch (error) {
        console.error("Failed to parse message:", error)
      }
    })

    client.on('error', (err) => {
      setConnectionStatus('Connection Error 🔴')
      console.error('MQTT Error:', err)
    })

    // 组件卸载时断开连接
    return () => {
      if (client) client.end()
    }
  }, [])

  // 辅助函数：根据状态返回颜色
  const getStatusColor = (status: String) => {
    switch (status) {
      case 'online': return '#10B981' // 绿色
      case 'afk': return '#F59E0B'    // 黄色
      case 'offline': return '#6B7280' // 灰色
      default: return '#374151'
    }
  }

  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>NotDeadYet 监控看板 👀</h1>
      <p style={{ fontSize: '0.8rem', color: '#666' }}>{connectionStatus}</p>

      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '2rem' }}>
        {Object.values(users).length === 0 ? (
          <p>房间里空空如也，等待探针接入...</p>
        ) : (
          Object.values(users).map((u, index) => (
            <div key={index} style={{
              border: '1px solid #ddd',
              borderRadius: '12px',
              padding: '1.5rem',
              width: '300px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
              backgroundColor: '#fff'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{u.user}</h3>
                <span style={{
                  backgroundColor: getStatusColor(u.status),
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  display: 'inline-block'
                }}></span>
              </div>

              <div style={{ fontSize: '0.9rem', color: '#444' }}>
                <p><strong>状态:</strong> {u.status.toUpperCase()}</p>
                {u.status !== 'offline' && (
                  <>
                    <p><strong>前台进程:</strong> {u.active_app || '未知'}</p>
                    <p style={{
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      <strong>窗口:</strong> {u.window_title || '***'}
                    </p>
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default App