import { useState } from 'react'
import Avatar from '../Avatar'
import ImageLightbox from '../ImageLightbox'

export default function ProfileHeader({ profile, isOwn = false, showEmail = false, onEdit }) {
  const [showImage, setShowImage] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const hasPhoto = Boolean(profile?.photoURL) && !imageFailed

  return (
    <>
      <section className="flex flex-wrap items-center gap-4 border-b border-gray-200 p-5 dark:border-gray-800">
        {hasPhoto ? (
          <button type="button" onClick={() => setShowImage(true)} aria-label="View profile picture" className="cursor-pointer rounded-full transition hover:ring-4 hover:ring-blue-100 dark:hover:ring-blue-900/40">
            <img src={profile.photoURL} alt="" onError={() => setImageFailed(true)} className="h-24 w-24 rounded-full object-cover sm:h-32 sm:w-32" />
          </button>
        ) : (
          <Avatar name={profile?.name} className="h-24 w-24 text-4xl sm:h-32 sm:w-32" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-extrabold text-gray-900 dark:text-gray-100">{profile?.name}</h2>
          <p className="truncate text-sm text-gray-500 dark:text-gray-400">{profile?.username}</p>
          {showEmail && <p className="truncate text-sm text-gray-500 dark:text-gray-400">{profile?.email}</p>}
        </div>
        {isOwn && onEdit && <button type="button" onClick={onEdit} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-bold dark:border-gray-800">Edit profile</button>}
      </section>
      {showImage && <ImageLightbox src={profile.photoURL} alt={`${profile.name}'s profile picture`} onClose={() => setShowImage(false)} />}
    </>
  )
}
