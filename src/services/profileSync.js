import { collection, collectionGroup, getDocs, query, where, writeBatch } from 'firebase/firestore'
import { db } from '../lib/firebase'

const BATCH_SIZE = 400

function changedFields(data, profile, fields) {
  return fields.reduce((result, field) => {
    const storedValue = field.toLowerCase().includes('photo') ? (data[field] || '') : data[field]
    const currentValue = field.toLowerCase().includes('photo') ? (profile[field] || '') : profile[field]
    if (storedValue !== currentValue) {
      result[field] = currentValue
    }
    return result
  }, {})
}

export async function syncProfileEverywhere(uid, profile, onProgress = () => {}) {
  const targets = [
    { label: 'posts', reference: query(collection(db, 'posts'), where('uid', '==', uid)), fields: { name: profile.name, username: profile.username, photoURL: profile.photoURL } },
    { label: 'articles', reference: query(collection(db, 'articles'), where('authorId', '==', uid)), fields: { authorName: profile.name, authorUsername: profile.username, authorPhotoURL: profile.photoURL } },
    { label: 'replies', reference: query(collectionGroup(db, 'replies'), where('uid', '==', uid)), fields: { name: profile.name, username: profile.username, photoURL: profile.photoURL } },
    { label: 'likes', reference: query(collectionGroup(db, 'likes'), where('uid', '==', uid)), fields: { name: profile.name, username: profile.username, photoURL: profile.photoURL } },
  ]
  const operations = []

  try {
    for (const target of targets) {
      onProgress(target.label)
      const snapshot = await getDocs(target.reference)
      snapshot.docs.forEach((item) => {
        const updates = changedFields(item.data(), target.fields, Object.keys(target.fields))
        if (Object.keys(updates).length) operations.push({ reference: item.ref, updates })
      })
    }
    for (let index = 0; index < operations.length; index += BATCH_SIZE) {
      const batch = writeBatch(db)
      operations.slice(index, index + BATCH_SIZE).forEach(({ reference, updates }) => batch.update(reference, updates))
      await batch.commit()
      onProgress('saving', Math.min(index + BATCH_SIZE, operations.length), operations.length)
    }
    return operations.length
  } catch (error) {
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.error('Profile sync collection group query failed. Create the required Firestore index using the link in this error.', error)
      throw new Error('Your profile was saved, but some old posts couldn’t be updated because Firestore needs an index.')
    }
    throw error
  }
}
