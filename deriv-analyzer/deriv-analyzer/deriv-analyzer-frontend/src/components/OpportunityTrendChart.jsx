import React from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const OpportunityTrendChart = ({ data, darkMode }) => {
  if (!data) return null

  // Função para ordenar mercados
  const getOrderedMarkets = () => {
    const customOrder = ['1HZ10V', '1HZ25V', '1HZ50V', '1HZ75V', '1HZ100V']
    const markets = Object.keys(data)
    
    return markets.sort((a, b) => {
      const indexA = customOrder.indexOf(a)
      const indexB = customOrder.indexOf(b)
      
      if (indexA === -1) return 1
      if (indexB === -1) return -1
      
      return indexA - indexB
    })
  }

  // Prepara dados para o gráfico de tendência, garantindo a ordem correta dos mercados
  const trendData = getOrderedMarkets().map(market => {
    const marketData = data[market]
    if (!marketData) return null

    let bestRate = 0
    let worstRate = 100
    let bestDigit = 'N/A'
    let worstDigit = 'N/A'

    // Encontra a melhor e pior taxa de acerto e o dígito correspondente
    Object.entries(marketData.groups || {}).forEach(([groupLen, group]) => {
      if (group.geral && group.geral.entradas > 0) {
        const rate = group.geral.taxa_acerto
        if (rate > bestRate) {
          bestRate = rate
          bestDigit = groupLen
        }
        if (rate < worstRate) {
          worstRate = rate
          worstDigit = groupLen
        }
      }
    })

    return {
      market,
      melhor: bestRate,
      pior: worstRate,
      diferenca: bestRate - worstRate,
      bestDigit,
      worstDigit
    }
  }).filter(item => item && item.melhor > 0) // Remove mercados sem dados ou com dados inválidos

  return (
    <Card className={`mb-8 ${darkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
      <CardHeader>
        <CardTitle className={`flex items-center space-x-2 ${darkMode ? 'text-white' : ''}`}>
          <span>Tendência de Oportunidades</span>
        </CardTitle>
        <CardDescription className={darkMode ? 'text-gray-400' : ''}>
          Comparação entre melhor e pior oportunidade por mercado
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" stroke={darkMode ? '#374151' : '#e5e7eb'} />
            <XAxis 
              dataKey="market" 
              stroke={darkMode ? '#9ca3af' : '#6b7280'}
              fontSize={12}
            />
            <YAxis 
              stroke={darkMode ? '#9ca3af' : '#6b7280'}
              fontSize={12}
              domain={[0, 100]}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: darkMode ? '#374151' : '#ffffff',
                border: `1px solid ${darkMode ? '#4b5563' : '#e5e7eb'}`,
                borderRadius: '6px',
                color: darkMode ? '#ffffff' : '#000000'
              }}
              formatter={(value, name, props) => {
                const { payload } = props
                if (name === 'melhor') {
                  return [`${value.toFixed(1)}%`, `Melhor Oportunidade (${payload.bestDigit} dígitos)`]
                } else if (name === 'pior') {
                  return [`${value.toFixed(1)}%`, `Pior Oportunidade (${payload.worstDigit} dígitos)`]
                }
                return [`${value.toFixed(1)}%`, name]
              }}
            />
            <Line 
              type="monotone" 
              dataKey="melhor" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              name="melhor"
            />
            <Line 
              type="monotone" 
              dataKey="pior" 
              stroke="#ef4444" 
              strokeWidth={3}
              dot={{ fill: '#ef4444', strokeWidth: 2, r: 4 }}
              name="pior"
            />
          </LineChart>
        </ResponsiveContainer>
        
        {/* Resumo das oportunidades */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-green-900/20 border border-green-700' : 'bg-green-50 border border-green-200'}`}>
            <div className={`text-sm font-medium ${darkMode ? 'text-green-400' : 'text-green-700'}`}>
              Melhor Oportunidade Atual
            </div>
            {(() => {
              const best = trendData.reduce((max, item) => item.melhor > max.melhor ? item : max, { melhor: 0, market: 'N/A', bestDigit: 'N/A' })
              return (
                <div className={`text-lg font-bold ${darkMode ? 'text-green-300' : 'text-green-800'}`}>
                  {best.market}: {best.melhor.toFixed(1)}% ({best.bestDigit} dígitos)
                </div>
              )
            })()}
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-red-900/20 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
            <div className={`text-sm font-medium ${darkMode ? 'text-red-400' : 'text-red-700'}`}>
              Pior Oportunidade Atual
            </div>
            {(() => {
              const worst = trendData.reduce((min, item) => item.pior < min.pior ? item : min, { pior: 100, market: 'N/A', worstDigit: 'N/A' })
              return (
                <div className={`text-lg font-bold ${darkMode ? 'text-red-300' : 'text-red-800'}`}>
                  {worst.market}: {worst.pior.toFixed(1)}% ({worst.worstDigit} dígitos)
                </div>
              )
            })()}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OpportunityTrendChart

