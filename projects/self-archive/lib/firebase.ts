'use client'

import { initializeApp, getApps } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyDKPcRW_CoIq3HIx9zt3IarMUVhxJEerYU",
  authDomain: "jangyeonga.firebaseapp.com",
  projectId: "jangyeonga",
  storageBucket: "jangyeonga.firebasestorage.app",
  messagingSenderId: "394862667655",
  appId: "1:394862667655:web:06193f7ae8b93a00f69522",
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]
export const db = getFirestore(app)
