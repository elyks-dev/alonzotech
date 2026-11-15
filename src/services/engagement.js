import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDocs,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'

const BATCH_SIZE = 400

export async function toggleLike(parentCollection, parentId, profile) {
  const likeReference = doc(db, parentCollection, parentId, 'likes', profile.uid)
  let liked
  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(likeReference)
    liked = !snapshot.exists()
    if (snapshot.exists()) {
      transaction.delete(likeReference)
      transaction.update(doc(db, parentCollection, parentId), { likes: increment(-1) })
    } else {
      transaction.set(likeReference, {
        uid: profile.uid,
        name: profile.name,
        username: profile.username,
        photoURL: profile.photoURL,
        createdAt: serverTimestamp(),
      })
      transaction.update(doc(db, parentCollection, parentId), { likes: increment(1) })
    }
  })
  return liked
}

export async function addReply(parentCollection, parentId, profile, text) {
  const replyReference = doc(collection(db, parentCollection, parentId, 'replies'))
  const batch = writeBatch(db)
  batch.set(replyReference, { uid: profile.uid, name: profile.name, username: profile.username, photoURL: profile.photoURL || '', text, createdAt: serverTimestamp() })
  batch.update(doc(db, parentCollection, parentId), { repliesCount: increment(1) })
  await batch.commit()
  return { id: replyReference.id, uid: profile.uid, name: profile.name, username: profile.username, photoURL: profile.photoURL || '', text, createdAt: { toDate: () => new Date() } }
}

export async function loadLikes(parentCollection, parentId) {
  const snapshot = await getDocs(query(collection(db, parentCollection, parentId, 'likes'), orderBy('createdAt', 'desc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function loadReplies(parentCollection, parentId) {
  const snapshot = await getDocs(query(collection(db, parentCollection, parentId, 'replies'), orderBy('createdAt', 'asc')))
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))
}

export async function deleteAllEngagement(parentCollection, parentId) {
  for (const childCollection of ['replies', 'likes']) {
    const snapshot = await getDocs(collection(db, parentCollection, parentId, childCollection))
    for (let index = 0; index < snapshot.docs.length; index += BATCH_SIZE) {
      const batch = writeBatch(db)
      snapshot.docs.slice(index, index + BATCH_SIZE).forEach((item) => batch.delete(item.ref))
      await batch.commit()
    }
  }
}
