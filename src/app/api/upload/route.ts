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
  console.log('Upload API called')
  console.log('Environment check:', {
    hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY, 
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
    nodeEnv: process.env.NODE_ENV,
    vercel: process.env.VERCEL
  })

  // Cloudinary設定チェック
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    console.error('Cloudinary環境変数が設定されていません')
    return NextResponse.json({ 
      success: false, 
      message: 'サーバー設定エラー: Cloudinary環境変数が不足しています' 
    }, { status: 500 })
  }
  
  try {
    console.log('FormData取得開始')
    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File
    const photoId = data.get('photoId') as string
    console.log('FormData取得完了:', { fileExists: !!file, photoId })

    if (!file) {
      console.log('ファイルが見つかりません')
      return NextResponse.json({ success: false, message: 'ファイルが見つかりません' })
    }

    // ファイル形式チェック
    console.log('ファイル形式チェック:', { type: file.type, name: file.name, size: file.size })
    if (!file.type.startsWith('image/')) {
      console.log('無効なファイル形式:', file.type)
      return NextResponse.json({ success: false, message: '画像ファイルのみアップロード可能です' })
    }

    // ファイルサイズチェック（10MB制限）
    if (file.size > 10 * 1024 * 1024) {
      console.log('ファイルサイズが大きすぎます:', file.size)
      return NextResponse.json({ success: false, message: 'ファイルサイズは10MB以下にしてください' })
    }

    console.log('Base64変換開始')
    // ファイルをBase64に変換してCloudinaryにアップロード
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const base64 = `data:${file.type};base64,${buffer.toString('base64')}`
    console.log('Base64変換完了:', { base64Length: base64.length })

    console.log('Cloudinaryアップロード開始')
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
    console.log('Cloudinaryアップロード完了:', { 
      publicId: uploadResult.public_id, 
      secureUrl: uploadResult.secure_url 
    })

    // データベースの写真レコードを更新または作成
    const imageUrl = uploadResult.secure_url
    console.log('データベース更新処理開始:', { photoId, nodeEnv: process.env.NODE_ENV })
    
    // データベース更新（本番環境では安全に処理）
    if (photoId) {
      try {
        console.log('Prisma更新試行:', photoId)
        await prisma.photo.update({
          where: { id: photoId },
          data: { imageUrl }
        })
        console.log('データベース更新成功:', photoId)
      } catch (error) {
        console.log('写真レコードが見つからないか、データベースエラー:', error)
        // レコードが存在しない場合はエラーとせず、アップロードは成功として扱う
      }
    } else {
      console.log('photoIdが空のため、データベース更新をスキップ')
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