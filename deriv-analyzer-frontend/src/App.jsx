import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { Activity, TrendingUp, TrendingDown, Wifi, WifiOff, RefreshCw, BarChart3, Play, Pause, RotateCcw, Filter, Moon, Sun, Bell, AlertTriangle } from 'lucide-react'
import OpportunityTrendChart from './components/OpportunityTrendChart'
import './App.css'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']
const API_BASE_URL = 'http://localhost:5000/api'

function App() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedMarket, setSelectedMarket] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [isRunning, setIsRunning] = useState(false)
  const [systemStatus, setSystemStatus] = useState(null)
  const [dataFilter, setDataFilter] = useState(1000)
  const [recentTickets, setRecentTickets] = useState([])
  const [darkMode, setDarkMode] = useState(false)
  const [notifications, setNotifications] = useState([])
  
  // Estados para alertas sonoros
  const [activeAlerts, setActiveAlerts] = useState([])
  const [audioContext, setAudioContext] = useState(null)
  const [alertIntervals, setAlertIntervals] = useState({})
  const [alertsEnabled, setAlertsEnabled] = useState(true)
  
  // Estados para notificações do navegador
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false)
  const [notificationPermission, setNotificationPermission] = useState('default')

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE_URL}/data`)
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`)
      }
      const result = await response.json()
      if (result.success) {
        setData(result.data)
        setLastUpdate(new Date(result.timestamp * 1000))
        setError(null)
        analyzeOpportunities(result.data)
        checkSpecialFilters(result.data)
      } else {
        throw new Error(result.error || 'Erro desconhecido')
      }
    } catch (err) {
      setError(err.message)
      console.error('Erro ao buscar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchStatus = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/status`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setSystemStatus(result)
          setIsRunning(result.is_running)
        }
      }
    } catch (err) {
      console.error('Erro ao buscar status:', err)
    }
  }

  const fetchRecentTickets = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/recent-tickets`)
      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          setRecentTickets(result.tickets.slice(-10)) // Últimos 10 tickets
        }
      }
    } catch (err) {
      console.error('Erro ao buscar tickets recentes:', err)
    }
  }

  const startCollection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/start`, { method: 'POST' })
      const result = await response.json()
      if (result.success) {
        setIsRunning(true)
        setNotifications(prev => [...prev, { 
          type: 'success', 
          message: (
            <>
              ✅ <strong>Coleta Iniciada com Sucesso!</strong> O sistema está agora <strong>monitorando os mercados em tempo real</strong> e coletando dados para análise.
            </>
          ), 
          timestamp: Date.now(),
          closeable: true 
        }])
      } else {
        setNotifications(prev => [...prev, { 
          type: 'error', 
          message: (
            <>
              ❌ <strong>Falha ao Iniciar:</strong> {result.message}. Verifique a <strong>conexão</strong> e tente novamente.
            </>
          ), 
          timestamp: Date.now(),
          closeable: true 
        }])
      }
    } catch (err) {
      setNotifications(prev => [...prev, { 
        type: 'error', 
        message: (
          <>
            ❌ <strong>Erro de Conexão:</strong> Não foi possível iniciar a coleta de dados. Verifique sua <strong>conexão com a internet</strong> e o <strong>status do servidor</strong>.
          </>
        ), 
        timestamp: Date.now(),
        closeable: true 
      }])
    }
  }

  const stopCollection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stop`, { method: 'POST' })
      const result = await response.json()
      if (result.success) {
        setIsRunning(false)
        setNotifications(prev => [...prev, { 
          type: 'info', 
          message: (
            <>
              ⏸️ <strong>Coleta Pausada:</strong> A coleta de dados foi interrompida. Os <strong>dados já coletados</strong> permanecem disponíveis para análise.
            </>
          ), 
          timestamp: Date.now(),
          closeable: true 
        }])
      } else {
        setNotifications(prev => [...prev, { 
          type: 'error', 
          message: (
            <>
              ❌ <strong>Erro ao Parar:</strong> {result.message}. Tente novamente.
            </>
          ), 
          timestamp: Date.now(),
          closeable: true 
        }])
      }
    } catch (err) {
      setNotifications(prev => [...prev, { 
        type: 'error', 
        message: (
          <>
            ❌ <strong>Erro de Conexão:</strong> Não foi possível parar a coleta. Verifique sua <strong>conexão</strong>.
          </>
        ), 
        timestamp: Date.now(),
        closeable: true 
      }])
    }
  }

  const resetData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/reset`, { method: 'POST' })
      const result = await response.json()
      if (result.success) {
        setData(null)
        setRecentTickets([])
        setNotifications(prev => [...prev, { 
          type: 'info', 
          message: (
            <>
              🔄 <strong>Dados Resetados:</strong> Todos os <strong>dados históricos</strong> foram limpos. Você pode iniciar uma <strong>nova coleta</strong> para começar com dados frescos.
            </>
          ), 
          timestamp: Date.now(),
          closeable: true 
        }])
      }
    } catch (err) {
      setNotifications(prev => [...prev, { 
        type: 'error', 
        message: (
          <>
            ❌ <strong>Erro ao Resetar:</strong> Não foi possível limpar os dados. Verifique sua <strong>conexão</strong> e tente novamente.
          </>
        ), 
        timestamp: Date.now(),
        closeable: true 
      }])
    }
  }

  const updateFilter = async (newFilter) => {
    try {
      const response = await fetch(`${API_BASE_URL}/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: newFilter })
      })
      const result = await response.json()
      if (result.success) {
        setDataFilter(newFilter)
        fetchData() // Recarrega os dados com o novo filtro
      }
    } catch (err) {
      console.error('Erro ao atualizar filtro:', err)
    }
  }

  const analyzeOpportunities = (marketData) => {
    if (!marketData) return

    let bestOpportunity = null
    let worstOpportunity = null
    let bestRate = 0
    let worstRate = 100

    Object.entries(marketData).forEach(([market, data]) => {
      if (data.groups) {
        Object.entries(data.groups).forEach(([groupLen, group]) => {
          if (group.geral && group.geral.entradas > 10) { // Só considera com pelo menos 10 entradas
            const rate = group.geral.taxa_acerto
            if (rate > bestRate) {
              bestRate = rate
              bestOpportunity = { market, groupLen, rate, type: 'geral' }
            }
            if (rate < worstRate) {
              worstRate = rate
              worstOpportunity = { market, groupLen, rate, type: 'geral' }
            }
          }
        })
      }
    })

    // Adiciona notificações de oportunidades
    if (bestOpportunity && bestRate > 70) {
      setNotifications(prev => {
        const exists = prev.some(n => n.type === 'opportunity' && n.market === bestOpportunity.market)
        if (!exists) {
          // Envia notificação do navegador para oportunidades favoráveis
          if (browserNotificationsEnabled) {
            sendBrowserNotification(
              `✅ OPORTUNIDADE FAVORÁVEL - ${bestOpportunity.market}`,
              `Grupo ${bestOpportunity.groupLen} dígitos com excelente taxa de acerto: ${bestRate.toFixed(1)}%. Considere suas estratégias!`,
              '📈'
            )
          }
          
          return [...prev, {
            type: 'opportunity',
            message: (
              <>
                ✅ <strong>OPORTUNIDADE FAVORÁVEL:</strong> O mercado <strong>{bestOpportunity.market}</strong> com grupos de <strong>{bestOpportunity.groupLen} dígitos</strong> está apresentando uma <strong>excelente taxa de acerto de {bestRate.toFixed(1)}%</strong>. Esta é uma boa opção para considerar suas estratégias!
              </>
            ),
            market: bestOpportunity.market,
            timestamp: Date.now(),
            closeable: true
          }]
        }
        return prev
      })
    }

    if (worstOpportunity && worstRate < 30) {
      setNotifications(prev => {
        const exists = prev.some(n => n.type === 'warning' && n.market === worstOpportunity.market)
        if (!exists) {
          // Envia notificação do navegador para alertas de baixa performance
          if (browserNotificationsEnabled) {
            sendBrowserNotification(
              `⚠️ ATENÇÃO - ${worstOpportunity.market}`,
              `Grupo ${worstOpportunity.groupLen} dígitos com baixa performance: ${worstRate.toFixed(1)}%. Recomendamos evitar este padrão.`,
              '📉'
            )
          }
          
          return [...prev, {
            type: 'warning',
            message: (
              <>
                ⚠️ <strong>ATENÇÃO - BAIXA PERFORMANCE:</strong> O mercado <strong>{worstOpportunity.market}</strong> com grupos de <strong>{worstOpportunity.groupLen} dígitos</strong> está com <strong>taxa de acerto muito baixa ({worstRate.toFixed(1)}%)</strong>. Recomendamos evitar este padrão no momento.
              </>
            ),
            market: worstOpportunity.market,
            timestamp: Date.now(),
            closeable: true
          }]
        }
        return prev
      })
    }
  }

  // Funções para alertas sonoros
  const initAudioContext = () => {
    if (!audioContext) {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      setAudioContext(ctx)
      return ctx
    }
    return audioContext
  }

  const playAlertSound = (ctx) => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    
    oscillator.frequency.setValueAtTime(800, ctx.currentTime) // Frequência do som
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(800, ctx.currentTime + 0.2)
    
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
    
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  }

  // Funções para notificações do navegador
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.log('Este navegador não suporta notificações')
      return false
    }

    if (Notification.permission === 'granted') {
      setBrowserNotificationsEnabled(true)
      setNotificationPermission('granted')
      return true
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission()
      setNotificationPermission(permission)
      
      if (permission === 'granted') {
        setBrowserNotificationsEnabled(true)
        return true
      }
    }
    
    return false
  }

  const sendBrowserNotification = (title, body, icon = '🚨') => {
    if (!browserNotificationsEnabled || Notification.permission !== 'granted') {
      return
    }

    try {
      const notification = new Notification(title, {
        body: body,
        icon: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">${icon}</text></svg>`,
        badge: `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">📊</text></svg>`,
        tag: 'deriv-analyzer',
        requireInteraction: true,
        silent: false
      })

      // Auto-close após 10 segundos
      setTimeout(() => {
        notification.close()
      }, 10000)

      // Foca na janela quando clicado
      notification.onclick = () => {
        window.focus()
        notification.close()
      }
    } catch (error) {
      console.error('Erro ao enviar notificação:', error)
    }
  }

  const toggleBrowserNotifications = async () => {
    if (!browserNotificationsEnabled) {
      const granted = await requestNotificationPermission()
      if (granted) {
        sendBrowserNotification(
          'Notificações Ativadas!',
          'Você receberá alertas sobre oportunidades de entrada e análises de mercado.',
          '✅'
        )
      }
    } else {
      setBrowserNotificationsEnabled(false)
    }
  }

  const checkSpecialFilters = (marketData) => {
    if (!marketData || !alertsEnabled) return

    const filterRules = {
      '7': 6,   // Grupo 7: alerta se > 6 losses seguidas
      '8': 5,   // Grupo 8: alerta se > 5 losses seguidas
      '9': 4,   // Grupo 9: alerta se > 4 losses seguidas
      '10': 3,  // Grupo 10: alerta se > 3 losses seguidas
      '11': 2,  // Grupo 11: alerta se > 2 losses seguidas
      '12': 2,  // Grupo 12: alerta se > 2 losses seguidas
      '13': 1,  // Grupo 13: alerta se > 1 loss seguida
      '14': 1,  // Grupo 14: alerta se > 1 loss seguida
      '15': 1   // Grupo 15: alerta se > 1 loss seguida
    }

    const newAlerts = []

    Object.entries(marketData).forEach(([market, data]) => {
      if (data.groups) {
        Object.entries(filterRules).forEach(([groupLen, threshold]) => {
          const group = data.groups[groupLen]
          if (group && group.geral) {
            const currentLossSeq = group.geral.seq_loss_atual || 0
            const alertKey = `${market}-${groupLen}`
            
            if (currentLossSeq > threshold) {
              // Verifica se já não está alertando
              if (!activeAlerts.includes(alertKey)) {
                newAlerts.push({
                  key: alertKey,
                  market,
                  groupLen,
                  currentLossSeq,
                  threshold,
                  message: (
                    <>
                      🚨 <strong>MOMENTO DE ENTRADA DETECTADO!</strong> O mercado <strong>{market}</strong> com grupos de <strong>{groupLen} dígitos</strong> acumulou <strong>{currentLossSeq} perdas consecutivas</strong> (acima do limite de <strong>{threshold}</strong>). Segundo a <strong>estratégia de reversão</strong>, esta pode ser uma <strong>oportunidade favorável para entrada</strong>. Analise o padrão e considere sua estratégia!
                    </>
                  )
                })
              }
            } else {
              // Remove alerta se a condição não é mais atendida
              if (activeAlerts.includes(alertKey)) {
                setActiveAlerts(prev => prev.filter(alert => alert !== alertKey))
                if (alertIntervals[alertKey]) {
                  clearInterval(alertIntervals[alertKey])
                  setAlertIntervals(prev => {
                    const newIntervals = { ...prev }
                    delete newIntervals[alertKey]
                    return newIntervals
                  })
                }
              }
            }
          }
        })
      }
    })

    // Adiciona novos alertas
    if (newAlerts.length > 0) {
      const ctx = initAudioContext()
      
      newAlerts.forEach(alert => {
        setActiveAlerts(prev => [...prev, alert.key])
        
        // Adiciona notificação
        setNotifications(prev => [...prev, {
          type: 'alert',
          message: alert.message,
          timestamp: Date.now(),
          closeable: true,
          alertKey: alert.key
        }])
        
        // Envia notificação do navegador para alertas de entrada (grupos 7-11)
        if (browserNotificationsEnabled && ['7', '8', '9', '10', '11'].includes(alert.groupLen)) {
          sendBrowserNotification(
            `🚨 MOMENTO DE ENTRADA - ${alert.market}`,
            `Grupo ${alert.groupLen} dígitos: ${alert.currentLossSeq} perdas consecutivas detectadas. Oportunidade de entrada segundo estratégia de reversão!`,
            '🎯'
          )
        }
        
        // Inicia som contínuo
        const intervalId = setInterval(() => {
          if (ctx.state === 'suspended') {
            ctx.resume()
          }
          playAlertSound(ctx)
        }, 1500) // Toca a cada 1.5 segundos
        
        setAlertIntervals(prev => ({
          ...prev,
          [alert.key]: intervalId
        }))
      })
    }
  }

  const closeAlert = (alertKey) => {
    setActiveAlerts(prev => prev.filter(alert => alert !== alertKey))
    if (alertIntervals[alertKey]) {
      clearInterval(alertIntervals[alertKey])
      setAlertIntervals(prev => {
        const newIntervals = { ...prev }
        delete newIntervals[alertKey]
        return newIntervals
      })
    }
    // Remove notificação relacionada
    setNotifications(prev => prev.filter(n => n.alertKey !== alertKey))
  }

  const toggleAlerts = () => {
    setAlertsEnabled(!alertsEnabled)
    if (!alertsEnabled) {
      // Para todos os alertas ativos
      Object.values(alertIntervals).forEach(intervalId => {
        clearInterval(intervalId)
      })
      setAlertIntervals({})
      setActiveAlerts([])
    }
  }

  useEffect(() => {
    fetchStatus()
    fetchData()
    const interval = setInterval(() => {
      fetchData()
      fetchStatus()
      if (isRunning) {
        fetchRecentTickets()
      }
    }, 1000) // Atualiza a cada 1 segundo para tempo real
    return () => clearInterval(interval)
  }, [isRunning])

  // Verifica permissão de notificação ao carregar
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission)
      if (Notification.permission === 'granted') {
        setBrowserNotificationsEnabled(true)
      }
    }
  }, [])

  // Limpa notificações antigas
  useEffect(() => {
    const cleanup = setInterval(() => {
      setNotifications(prev => prev.filter(n => Date.now() - n.timestamp < 30000)) // Remove após 30 segundos
    }, 5000)
    return () => clearInterval(cleanup)
  }, [])

  const getMarketSummary = (marketData) => {
    if (!marketData || !marketData.groups) return null
    
    let totalEntradas = 0
    let totalWins = 0
    let totalLosses = 0
    let maxWinSequence = 0
    let maxLossSequence = 0
    
    Object.values(marketData.groups).forEach(group => {
      if (group.geral) {
        totalEntradas += group.geral.entradas
        totalWins += group.geral.wins
        totalLosses += group.geral.losses
        maxWinSequence = Math.max(maxWinSequence, group.geral.max_win || 0)
        maxLossSequence = Math.max(maxLossSequence, group.geral.max_loss || 0)
      }
    })
    
    const taxaAcerto = totalEntradas > 0 ? (totalWins / totalEntradas) * 100 : 0
    
    return {
      totalEntradas,
      totalWins,
      totalLosses,
      taxaAcerto: taxaAcerto.toFixed(2),
      maxWinSequence,
      maxLossSequence
    }
  }

  const getChartData = (marketData, groupLen, tipo = 'geral') => {
    if (!marketData || !marketData.groups || !marketData.groups[groupLen] || !marketData.groups[groupLen][tipo]) {
      return []
    }
    
    const data = marketData.groups[groupLen][tipo]
    return [
      { name: 'Wins', value: data.wins, color: '#00C49F' },
      { name: 'Losses', value: data.losses, color: '#FF8042' }
    ]
  }

  const getGroupComparisonData = (marketData) => {
    if (!marketData || !marketData.groups) return []
    
    return Object.entries(marketData.groups).map(([groupLen, group]) => ({
      grupo: `${groupLen} dígitos`,
      taxa_acerto: group.geral ? group.geral.taxa_acerto : 0,
      entradas: group.geral ? group.geral.entradas : 0,
      wins: group.geral ? group.geral.wins : 0,
      losses: group.geral ? group.geral.losses : 0
    })).filter(item => item.entradas > 0)
  }

  // Garante a ordem específica dos mercados: 1HZ10V, 1HZ25V, 1HZ50V, 1HZ75V, 1HZ100V
  const getOrderedMarkets = () => {
    if (!data) return []
    const customOrder = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V']
    const markets = Object.keys(data)
    
    // Filtra os mercados existentes e os ordena de acordo com a ordem personalizada
    return markets.sort((a, b) => {
      const indexA = customOrder.indexOf(a)
      const indexB = customOrder.indexOf(b)
      
      // Se um mercado não estiver na lista personalizada, ele vai para o final
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      
      return indexA - indexB
    })
  }

  // Exporta a função para uso em outros componentes
  window.getOrderedMarkets = getOrderedMarkets

  if (loading && !data) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'} flex items-center justify-center`}>
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={`text-lg font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-red-50 to-pink-100'} flex items-center justify-center p-4`}>
        <Alert className="max-w-md">
          <AlertDescription>
            Erro ao carregar dados: {error}
            <Button onClick={fetchData} className="mt-2 w-full">
              Tentar Novamente
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-gradient-to-br from-slate-50 to-blue-50'}`}>
      {/* Header */}
      <header className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'} shadow-sm border-b`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Deriv Analyzer</h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Análise de Tickets em Tempo Real</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Controles */}
              <div className="flex items-center space-x-2">
                <Button
                  onClick={isRunning ? stopCollection : startCollection}
                  variant={isRunning ? "destructive" : "default"}
                  size="sm"
                >
                  {isRunning ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                  {isRunning ? 'Parar' : 'Iniciar'}
                </Button>
                
                <Button onClick={resetData} variant="outline" size="sm">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>

              {/* Filtro de dados */}
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4" />
                <Select value={dataFilter.toString()} onValueChange={(value) => updateFilter(value === "sem_filtro" ? "sem_filtro" : parseInt(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="500">500</SelectItem>
                    <SelectItem value="1000">1000</SelectItem>
                    <SelectItem value="3000">3000</SelectItem>
                    <SelectItem value="sem_filtro">Sem Filtro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Modo escuro */}
              <div className="flex items-center space-x-2">
                <Sun className="h-4 w-4" />
                <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                <Moon className="h-4 w-4" />
              </div>

              {/* Alertas sonoros */}
              <div className="flex items-center space-x-2">
                <Bell className={`h-4 w-4 ${alertsEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                <Switch checked={alertsEnabled} onCheckedChange={toggleAlerts} />
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Alertas {alertsEnabled ? 'ON' : 'OFF'}
                </span>
                {activeAlerts.length > 0 && (
                  <Badge variant="destructive" className="animate-pulse">
                    {activeAlerts.length}
                  </Badge>
                )}
              </div>

              {/* Notificações do navegador */}
              <div className="flex items-center space-x-2">
                <Bell className={`h-4 w-4 ${browserNotificationsEnabled ? 'text-blue-600' : 'text-gray-400'}`} />
                <Switch 
                  checked={browserNotificationsEnabled} 
                  onCheckedChange={toggleBrowserNotifications}
                  disabled={notificationPermission === 'denied'}
                />
                <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {notificationPermission === 'denied' ? 'Bloqueado' : 
                   browserNotificationsEnabled ? 'Notif ON' : 'Notif OFF'}
                </span>
              </div>

              {/* Status e última atualização */}
              <div className="text-right">
                {lastUpdate && (
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Última atualização: {lastUpdate.toLocaleTimeString('pt-BR')}
                  </p>
                )}
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {isRunning ? 'Coletando' : 'Parado'}
                  </span>
                </div>
              </div>

              <Button onClick={fetchData} disabled={loading} size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notificações */}
      {notifications.length > 0 && (
        <div className="notification-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
          <div className="space-y-3">
            {/* Separa notificações por tipo */}
            {(() => {
              const alertNotifications = notifications.filter(n => n.type === 'alert')
              const opportunityNotifications = notifications.filter(n => n.type === 'opportunity' || n.type === 'warning')
              const otherNotifications = notifications.filter(n => n.type !== 'opportunity' && n.type !== 'warning' && n.type !== 'alert')
              
              return (
                <>
                  {/* Alertas sonoros - Prioridade máxima */}
                  {alertNotifications.length > 0 && (
                    <div className="space-y-3">
                      {alertNotifications.map((notification, index) => (
                        <Alert key={`alert-${index}`} className="notification-alert alert-notification">
                          <div className="notification-content">
                            <div className="flex items-start">
                              <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                              <AlertDescription className="text-red-900 font-semibold leading-relaxed">
                                {notification.message}
                              </AlertDescription>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => closeAlert(notification.alertKey)}
                            className="notification-close-btn text-red-600 hover:text-red-800 hover:bg-red-200"
                          >
                            ✕ Fechar
                          </Button>
                        </Alert>
                      ))}
                    </div>
                  )}
                  
                  {/* Notificações de oportunidade - largura completa */}
                  {opportunityNotifications.length > 0 && (
                    <div className="space-y-3">
                      {opportunityNotifications.slice(-2).map((notification, index) => (
                        <Alert key={`opp-${index}`} className={`notification-alert ${
                          notification.type === 'opportunity' ? 'opportunity-notification' : 'warning-notification'
                        }`}>
                          <div className="notification-content">
                            <div className="flex items-start">
                              {notification.type === 'opportunity' && <TrendingUp className="h-5 w-5 text-green-600 mr-3 flex-shrink-0 mt-0.5" />}
                              {notification.type === 'warning' && <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />}
                              <AlertDescription className={`leading-relaxed ${
                                notification.type === 'opportunity' ? 'text-green-800' : 'text-red-800'
                              }`}>
                                {notification.message}
                              </AlertDescription>
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setNotifications(prev => prev.filter((_, i) => i !== notifications.indexOf(notification)))}
                            className={`notification-close-btn ${
                              notification.type === 'opportunity' 
                                ? 'text-green-600 hover:text-green-800 hover:bg-green-200' 
                                : 'text-red-600 hover:text-red-800 hover:bg-red-200'
                            }`}
                          >
                            ✕
                          </Button>
                        </Alert>
                      ))}
                    </div>
                  )}
                  
                  {/* Outras notificações - largura completa */}
                  {otherNotifications.slice(-2).map((notification, index) => (
                    <Alert key={`other-${index}`} className={`notification-alert ${
                      notification.type === 'success' ? 'success-notification' : 
                      notification.type === 'error' ? 'error-notification' : 'info-notification'
                    }`}>
                      <div className="notification-content">
                        <div className="flex items-start">
                          {notification.type === 'success' && <Bell className="h-5 w-5 text-blue-600 mr-3 flex-shrink-0 mt-0.5" />}
                          {notification.type === 'error' && <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />}
                          {notification.type === 'info' && <Bell className="h-5 w-5 text-gray-600 mr-3 flex-shrink-0 mt-0.5" />}
                          <AlertDescription className={`leading-relaxed ${
                            notification.type === 'success' ? 'text-blue-800' : 
                            notification.type === 'error' ? 'text-red-800' : 'text-gray-800'
                          }`}>
                            {notification.message}
                          </AlertDescription>
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setNotifications(prev => prev.filter((_, i) => i !== notifications.indexOf(notification)))}
                        className={`notification-close-btn ${
                          notification.type === 'success' ? 'text-blue-600 hover:text-blue-800 hover:bg-blue-200' : 
                          notification.type === 'error' ? 'text-red-600 hover:text-red-800 hover:bg-red-200' : 
                          'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        ✕
                      </Button>
                    </Alert>
                  ))}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <Alert className="mb-6 border-orange-200 bg-orange-50">
            <AlertDescription className="text-orange-800">
              Aviso: {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Market Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {data && getOrderedMarkets().map((market) => {
            const marketData = data[market]
            const summary = getMarketSummary(marketData)
            if (!summary) return null

            return (
              <Card 
                key={market} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedMarket === market ? 'ring-2 ring-blue-500 shadow-lg' : ''
                } ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}
                onClick={() => setSelectedMarket(selectedMarket === market ? null : market)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className={`text-lg font-semibold ${darkMode ? 'text-white' : ''}`}>{market}</CardTitle>
                    {marketData.connected ? (
                      <Wifi className="h-4 w-4 text-green-500" />
                    ) : (
                      <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                    {marketData.total_ticks} ticks coletados
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Taxa de Acerto</span>
                      <Badge 
                        variant={parseFloat(summary.taxaAcerto) >= 50 ? "default" : "destructive"}
                        className="font-semibold"
                      >
                        {summary.taxaAcerto}%
                      </Badge>
                    </div>
                    <Progress value={parseFloat(summary.taxaAcerto)} className="h-2" />
                    
                    {/* Sequências Máximas - Destaque */}
                    <div className={`border rounded-lg p-2 ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-green-600" />
                            <span className="font-semibold text-green-600">{summary.maxWinSequence}</span>
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Max Wins</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            <TrendingDown className="h-3 w-3 text-red-600" />
                            <span className="font-semibold text-red-600">{summary.maxLossSequence}</span>
                          </div>
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Max Losses</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{summary.totalEntradas}</div>
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Entradas</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-green-600">{summary.totalWins}</div>
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Wins</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-red-600">{summary.totalLosses}</div>
                        <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Losses</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Gráfico de Tendência de Oportunidades */}
        {data && <OpportunityTrendChart data={data} darkMode={darkMode} />}

        {/* Real-time Tickets Panel - Refatorado para mostrar por volatilidade */}
        {recentTickets.length > 0 && (
          <Card className={`mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : ''}`}>
                <Activity className="h-5 w-5" />
                <span>Tickets Recebidos em Tempo Real</span>
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                Monitoramento em tempo real por volatilidade - Atualização a cada 1 segundo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {getOrderedMarkets().map((market) => {
                  // Filtra os tickets mais recentes para cada mercado
                  const marketTickets = recentTickets
                    .filter(ticket => ticket.market === market)
                    .slice(-1) // Último ticket por mercado
                  
                  return (
                    <div key={market} className={`p-4 rounded-lg border ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                      <div className={`font-bold text-center mb-3 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {market}
                      </div>
                      <div className="space-y-2">
                        {marketTickets.length > 0 ? marketTickets.map((ticket, index) => (
                          <div key={index} className={`p-2 rounded text-xs ${darkMode ? 'bg-gray-600' : 'bg-white'}`}>
                            <div className={`font-semibold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                              Tick: {ticket.tick}
                            </div>
                            <div className={`${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                              Dígito: {ticket.digit}
                            </div>
                            <div className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {new Date(ticket.timestamp * 1000).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        )) : (
                          <div className={`text-center text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            Aguardando tickets...
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Detailed Market Analysis */}
        {selectedMarket && data[selectedMarket] && (
          <Card className={`mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
            <CardHeader>
              <CardTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : ''}`}>
                <Activity className="h-5 w-5" />
                <span>Análise Detalhada - {selectedMarket}</span>
              </CardTitle>
              <CardDescription className={darkMode ? 'text-gray-400' : ''}>
                Estatísticas por tamanho de grupo e tipo de estratégia (Filtro: {dataFilter} tickets)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                  <TabsTrigger value="groups">Por Grupos</TabsTrigger>
                  <TabsTrigger value="types">Por Tipos</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <CardHeader>
                        <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>Taxa de Acerto por Grupo</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={getGroupComparisonData(data[selectedMarket])}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="grupo" />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="taxa_acerto" fill="#0088FE" />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <CardHeader>
                        <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>Distribuição Wins vs Losses</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={300}>
                          <PieChart>
                            <Pie
                              data={getChartData(data[selectedMarket], '5')}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={120}
                              paddingAngle={5}
                              dataKey="value"
                            >
                              {getChartData(data[selectedMarket], '5').map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="groups" className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(data[selectedMarket].groups || {}).map(([groupLen, group]) => (
                      <Card key={groupLen} className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                        <CardHeader className="pb-3">
                          <CardTitle className={`text-base ${darkMode ? 'text-white' : ''}`}>Grupo de {groupLen} dígitos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            {['geral', 'pares', 'impares'].map(tipo => {
                              const data = group[tipo]
                              if (!data || data.entradas === 0) return null
                              
                              return (
                                <div key={tipo} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600' : ''}`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`font-medium capitalize ${darkMode ? 'text-white' : ''}`}>{tipo}</span>
                                    <Badge variant={data.taxa_acerto >= 50 ? "default" : "secondary"}>
                                      {data.taxa_acerto}%
                                    </Badge>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="text-center">
                                      <div className={`font-semibold ${darkMode ? 'text-white' : ''}`}>{data.entradas}</div>
                                      <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Entradas</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-green-600">{data.wins}</div>
                                      <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Wins</div>
                                    </div>
                                    <div className="text-center">
                                      <div className="font-semibold text-red-600">{data.losses}</div>
                                      <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Losses</div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="types" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {['geral', 'pares', 'impares'].map(tipo => (
                      <Card key={tipo} className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                        <CardHeader>
                          <CardTitle className={`text-lg capitalize ${darkMode ? 'text-white' : ''}`}>{tipo}</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {Object.entries(data[selectedMarket].groups || {}).map(([groupLen, group]) => {
                              const typeData = group[tipo]
                              if (!typeData || typeData.entradas === 0) return null
                              
                              return (
                                <div key={groupLen} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600' : ''}`}>
                                  <div className="flex justify-between items-center mb-2">
                                    <span className={`font-medium ${darkMode ? 'text-white' : ''}`}>{groupLen} dígitos</span>
                                    <Badge variant={typeData.taxa_acerto >= 50 ? "default" : "secondary"}>
                                      {typeData.taxa_acerto}%
                                    </Badge>
                                  </div>
                                  <Progress value={typeData.taxa_acerto} className="h-2 mb-3" />
                                  
                                  {/* Sequências Máximas - Seção destacada */}
                                  <div className={`border rounded-lg p-2 mb-3 ${darkMode ? 'border-gray-500 bg-gray-600' : 'border-gray-300 bg-gray-100'}`}>
                                    <div className={`text-xs font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Sequências Máximas</div>
                                    <div className="grid grid-cols-2 gap-3 text-xs">
                                      <div className="text-center">
                                        <div className="flex items-center justify-center space-x-1 mb-1">
                                          <TrendingUp className="h-3 w-3 text-green-600" />
                                          <span className="font-semibold text-green-600">{typeData.max_win || 0}</span>
                                        </div>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Max Wins</div>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Atual: {typeData.seq_win_atual || 0}</div>
                                      </div>
                                      <div className="text-center">
                                        <div className="flex items-center justify-center space-x-1 mb-1">
                                          <TrendingDown className="h-3 w-3 text-red-600" />
                                          <span className="font-semibold text-red-600">{typeData.max_loss || 0}</span>
                                        </div>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Max Losses</div>
                                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Atual: {typeData.seq_loss_atual || 0}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <div className={`font-semibold ${darkMode ? 'text-white' : ''}`}>{typeData.wins}W / {typeData.losses}L</div>
                                      <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Resultado</div>
                                    </div>
                                    <div>
                                      <div className={`font-semibold ${darkMode ? 'text-white' : ''}`}>{typeData.entradas}</div>
                                      <div className={darkMode ? 'text-gray-400' : 'text-gray-500'}>Total</div>
                                    </div>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <CardHeader>
                        <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>Sequências Máximas</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {Object.entries(data[selectedMarket].groups || {}).map(([groupLen, group]) => {
                            if (!group.geral || group.geral.entradas === 0) return null
                            
                            return (
                              <div key={groupLen} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600' : ''}`}>
                                <div className={`font-medium mb-2 ${darkMode ? 'text-white' : ''}`}>{groupLen} dígitos</div>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <TrendingUp className="h-4 w-4 text-green-600" />
                                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Max Wins: {group.geral.max_win}</span>
                                    </div>
                                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Atual: {group.geral.seq_win_atual}</div>
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <TrendingDown className="h-4 w-4 text-red-600" />
                                      <span className={darkMode ? 'text-gray-300' : 'text-gray-600'}>Max Losses: {group.geral.max_loss}</span>
                                    </div>
                                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Atual: {group.geral.seq_loss_atual}</div>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className={darkMode ? 'bg-gray-700 border-gray-600' : ''}>
                      <CardHeader>
                        <CardTitle className={`text-lg ${darkMode ? 'text-white' : ''}`}>Resumo de Performance</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {Object.entries(data[selectedMarket].groups || {}).map(([groupLen, group]) => {
                            if (!group.geral || group.geral.entradas === 0) return null
                            
                            const winRate = group.geral.taxa_acerto
                            const isGood = winRate >= 60
                            const isOk = winRate >= 45 && winRate < 60
                            const isBad = winRate < 45
                            
                            return (
                              <div key={groupLen} className={`border rounded-lg p-3 ${darkMode ? 'border-gray-600' : ''}`}>
                                <div className="flex justify-between items-center">
                                  <span className={`font-medium ${darkMode ? 'text-white' : ''}`}>{groupLen} dígitos</span>
                                  <div className="flex items-center space-x-2">
                                    {isGood && <TrendingUp className="h-4 w-4 text-green-600" />}
                                    {isOk && <Activity className="h-4 w-4 text-yellow-600" />}
                                    {isBad && <TrendingDown className="h-4 w-4 text-red-600" />}
                                    <Badge 
                                      variant={isGood ? "default" : isOk ? "secondary" : "destructive"}
                                    >
                                      {winRate}%
                                    </Badge>
                                  </div>
                                </div>
                                <div className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {group.geral.entradas} entradas • {group.geral.wins}W / {group.geral.losses}L
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}

export default App

