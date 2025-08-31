import { NextRequest, NextResponse } from 'next/server'
import { Mission } from '@/types'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { startLocation, endLocation, season, timeOfDay } = await request.json()

    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, using default missions')
      return NextResponse.json({ missions: getDefaultMissions() })
    }

    const prompt = createMissionPrompt(startLocation, endLocation, season, timeOfDay)

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `あなたは散歩中の写真撮影ミッションを作成するアシスタントです。場所と季節に応じて、3つのシンプルで達成可能なミッションを提案してください。各ミッションは1-3語の短い名前と、簡潔な説明をつけてください。JSON形式で回答してください。`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.8
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`OpenAI API error ${response.status}:`, errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()
    const generatedContent = data.choices[0]?.message?.content

    if (!generatedContent) {
      throw new Error('No content generated')
    }

    // JSON部分を抽出
    const jsonMatch = generatedContent.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response')
    }

    const parsedMissions = JSON.parse(jsonMatch[0])
    const missions = formatMissions(parsedMissions.missions)

    return NextResponse.json({ missions })

  } catch (error) {
    console.error('Mission generation error:', error)
    return NextResponse.json({ missions: getDefaultMissions() })
  }
}

function createMissionPrompt(startLocation: string, endLocation: string, season: string, timeOfDay: string): string {
  return `
${startLocation}から${endLocation}への散歩で、${season}の${timeOfDay}に撮影するミッションを3つ作成してください。

要求：
- 各ミッションは達成回数3回
- 場所の特徴や季節感を考慮
- 一眼レフカメラでの撮影を想定
- 簡潔で分かりやすい内容

以下の形式のJSONで回答してください：
{
  "missions": [
    {"name": "ミッション名", "description": "説明"},
    {"name": "ミッション名", "description": "説明"},
    {"name": "ミッション名", "description": "説明"}
  ]
}
  `.trim()
}

function formatMissions(rawMissions: Array<{ name: string; description: string }>): Mission[] {
  return rawMissions.map((mission, index) => ({
    id: uuidv4(),
    name: mission.name || `ミッション${index + 1}`,
    description: mission.description || '',
    completed: false,
    count: 0,
    targetCount: 3
  }))
}

function getDefaultMissions(): Mission[] {
  return [
    {
      id: uuidv4(),
      name: '古い建物',
      description: '歴史を感じる建築物を撮影',
      completed: false,
      count: 0,
      targetCount: 3
    },
    {
      id: uuidv4(),
      name: '緑のあるもの',
      description: '植物や自然を撮影',
      completed: false,
      count: 0,
      targetCount: 3
    },
    {
      id: uuidv4(),
      name: '面白い形',
      description: 'ユニークな形状のものを撮影',
      completed: false,
      count: 0,
      targetCount: 3
    }
  ]
}