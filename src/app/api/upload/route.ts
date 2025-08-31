import { NextRequest, NextResponse } from 'next/server'
import { writeFile } from 'fs/promises'
import { existsSync, mkdirSync } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    // Vercel本番環境ではファイルアップロードを一時的に無効化
    if (process.env.VERCEL === '1') {
      return NextResponse.json({ 
        success: false, 
        message: '本番環境ではファイルアップロードは現在利用できません。開発版をお使いください。' 
      })
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const photoId = data.get('photoId') as string

    if (!file) {
      return NextResponse.json({ success: false, message: 'ファイルが見つかりません' })
    }

    // ファイル形式チェック
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ success: false, message: '画像ファイルのみアップロード可能です' })
    }

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'ファイルサイズは5MB以下にしてください' })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // ファイル名生成（重複防止のためタイムスタンプ付き）
    const timestamp = Date.now()
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}_${originalName}`
    
    // public/uploads ディレクトリに保存
    const uploadDir = path.join(process.cwd(), 'public/uploads')
    const filePath = path.join(uploadDir, fileName)
    
    try {
      await writeFile(filePath, buffer)
    } catch (error) {
      console.error('ファイル書き込みエラー:', error)
      // uploads ディレクトリが存在しない場合は作成
      if (!existsSync(uploadDir)) {
        mkdirSync(uploadDir, { recursive: true })
        await writeFile(filePath, buffer)
      } else {
        throw error
      }
    }

    // データベースの写真レコードを更新
    const imageUrl = `/uploads/${fileName}`
    
    if (photoId) {
      await prisma.photo.update({
        where: { id: photoId },
        data: { imageUrl }
      })
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      message: '写真をアップロードしました'
    })

  } catch (error) {
    console.error('アップロードエラー:', error)
    return NextResponse.json({ 
      success: false, 
      message: 'アップロードに失敗しました'
    }, { status: 500 })
  }
}

// 複数ファイルアップロード対応
export async function PUT(request: NextRequest) {
  try {
    const data = await request.formData()
    const files = data.getAll('files') as File[]
    const photoIds = data.getAll('photoIds') as string[]

    if (!files.length) {
      return NextResponse.json({ success: false, message: 'ファイルが見つかりません' })
    }

    const results = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const photoId = photoIds[i]

      if (!file.type.startsWith('image/')) continue
      if (file.size > 5 * 1024 * 1024) continue

      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const timestamp = Date.now()
        const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
        const fileName = `${timestamp}_${i}_${originalName}`
        
        const uploadDir = path.join(process.cwd(), 'public/uploads')
        const filePath = path.join(uploadDir, fileName)
        
        await writeFile(filePath, buffer)
        const imageUrl = `/uploads/${fileName}`
        
        if (photoId) {
          await prisma.photo.update({
            where: { id: photoId },
            data: { imageUrl }
          })
        }

        results.push({ photoId, imageUrl, success: true })
      } catch (error) {
        console.error(`ファイル ${i} のアップロードエラー:`, error)
        results.push({ photoId, success: false, error: 'アップロード失敗' })
      }
    }

    return NextResponse.json({ 
      success: true, 
      results,
      message: `${results.filter(r => r.success).length}枚の写真をアップロードしました`
    })

  } catch (error) {
    console.error('一括アップロードエラー:', error)
    return NextResponse.json({ 
      success: false, 
      message: '一括アップロードに失敗しました'
    }, { status: 500 })
  }
}