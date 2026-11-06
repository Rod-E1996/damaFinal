import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function subscribePosts(cb, onError) {
  return onSnapshot(
    query(collection(db, 'forumPosts'), orderBy('createdAt', 'desc'), limit(200)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export function subscribePost(id, cb, onError) {
  return onSnapshot(doc(db, 'forumPosts', id), (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null), onError);
}

export async function createPost(user, { title, body, category, anonymous }) {
  const ref = await addDoc(collection(db, 'forumPosts'), {
    authorId: user.uid,
    authorName: anonymous ? 'Anónimo' : user.name,
    authorRole: user.role,
    title,
    body,
    category,
    commentCount: 0,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function deletePost(id) {
  await deleteDoc(doc(db, 'forumPosts', id));
}

export function subscribeComments(postId, cb, onError) {
  return onSnapshot(
    query(collection(db, 'forumPosts', postId, 'comments'), orderBy('createdAt', 'asc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function addComment(postId, user, body) {
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'forumPosts', postId, 'comments')), {
    authorId: user.uid,
    authorName: user.name,
    authorRole: user.role,
    body,
    createdAt: Date.now(),
  });
  batch.update(doc(db, 'forumPosts', postId), { commentCount: increment(1) });
  await batch.commit();
}
