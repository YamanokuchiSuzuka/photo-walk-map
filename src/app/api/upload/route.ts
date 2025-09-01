import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { prisma } from '@/lib/db'

// Cloudinary設定
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  try {

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

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: 'ファイルサイズは10MB以下にしてください' })
    }

    // ファイルをBase64に変換してCloudinaryにアップロード
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

    // Cloudinaryにアップロード
    const uploadResult = await cloudinary.uploader.upload(base64, {
      folder: 'photo-walk-map', // Cloudinary上のフォルダ名
      public_id: `${Date.now()}_${photoId}`, // ファイル名
      transformation: [
        { width: 1200, height: 1200, crop: 'limit' }, // 最大サイズ制限
        { quality: 'auto' }, // 自動品質最適化
        { format: 'auto' } // 自動フォーマット選択
      ]
    })

    // データベースの写真レコードを更新または作成
    const imageUrl = uploadResult.secure_url
    
    if (photoId) {
      try {
        await prisma.photo.update({
          where: { id: photoId },
          data: { imageUrl }
        })
      } catch (error) {
        console.log('写真レコードが見つからないため、アップロード情報のみ返します。')
        // レコードが存在しない場合はスキップして、アップロード成功として扱う
      }
    }

    return NextResponse.json({ 
      success: true, 
      imageUrl,
      publicId: uploadResult.public_id,
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
      if (file.size > 10 * 1024 * 1024) continue

      try {
        const bytes = await file.arrayBuffer()
        const buffer = Buffer.from(bytes)
        const base64 = `data:${file.type};base64,${buffer.toString('base64')}`

        // Cloudinaryにアップロード
        const uploadResult = await cloudinary.uploader.upload(base64, {
          folder: 'photo-walk-map',
          public_id: `${Date.now()}_${i}_${photoId}`,
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { format: 'auto' }
          ]
        })

        const imageUrl = uploadResult.secure_url
        
        if (photoId) {
          try {
            await prisma.photo.update({
              where: { id: photoId },
              data: { imageUrl }
            })
          } catch (error) {
            console.log(`写真レコード ${photoId} が見つからないため、アップロード情報のみ返します。`)
            // レコードが存在しない場合はスキップして、アップロード成功として扱う
          }
        }

        results.push({ photoId, imageUrl, publicId: uploadResult.public_id, success: true })
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