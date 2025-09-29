import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// --- [IMPORTANTE] LEER ANTES DE USAR EN PRODUCCIÓN ---
// Las credenciales de Firebase se han añadido directamente en este archivo
// para facilitar el desarrollo y las pruebas.
// 
// ¡ADVERTENCIA DE SEGURIDAD!
// NUNCA debes subir este archivo con las credenciales visibles a un repositorio
// público (como GitHub). Exponer estas claves puede comprometer tu proyecto de Firebase.
//
// Para producción (como en Vercel), DEBES usar Variables de Entorno, como se
// explicó anteriormente. Este método es solo para que puedas trabajar localmente.
const firebaseConfig = {
  apiKey: "AIzaSyAB5OM2zQiUYwM8k2Wl_MdPrrm8_mgjAL4",
  authDomain: "laterraza-64c60.firebaseapp.com",
  projectId: "laterraza-64c60",
  storageBucket: "laterraza-64c60.appspot.com",
  messagingSenderId: "696269543807",
  appId: "1:696269543807:web:8c780f33d649cee3ade24a",
  measurementId: "G-ZPGZGYFJN2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file to upload.
 * @param path The path in Firebase Storage where the file should be stored.
 * @returns A promise that resolves with the public download URL of the file.
 */
export const uploadFile = async (file: File, path: string): Promise<string> => {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
};
