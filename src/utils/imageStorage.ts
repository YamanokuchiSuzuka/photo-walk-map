// アップロードされた画像情報をローカルストレージで管理

export interface UploadedImage {
  photoId: string
  imageUrl: string
  missionName: string
  timestamp: string
  walkId?: string
}

const STORAGE_KEY = 'uploaded_images'

export function saveUploadedImage(image: UploadedImage) {
  try {
    const existing = getUploadedImages()
    const updated = [...existing, image]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch (error) {
    console.error('画像情報の保存に失敗しました:', error)
  }
}

export function getUploadedImages(): UploadedImage[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('画像情報の取得に失敗しました:', error)
    return []
  }
}

export function getImagesForWalk(walkId: string): UploadedImage[] {
  const allImages = getUploadedImages()
  return allImages.filter(img => img.walkId === walkId)
}

export function clearUploadedImages() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('画像情報のクリアに失敗しました:', error)
  }
}