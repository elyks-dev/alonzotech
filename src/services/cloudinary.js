const MAX_FILE_SIZE = 5 * 1024 * 1024

export async function uploadImage(file) {
  if (!file?.type?.startsWith('image/')) {
    throw new Error('Please select an image file.')
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Image must be 5 MB or smaller.')
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary upload is not configured.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', uploadPreset)

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok || !data.secure_url) {
    throw new Error(data.error?.message || 'Unable to upload the image.')
  }
  return data.secure_url
}
