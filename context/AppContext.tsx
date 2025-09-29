import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Event, AppSettings, PurchasedTicket, PendingPurchase, User, CompletedPurchase, ShapeStatus } from '../types';
import { auth, db, storage } from '../firebase/config';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection, onSnapshot, doc, getDoc, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, serverTimestamp, runTransaction
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';

type TicketToCreate = Omit<PurchasedTicket, 'id' | 'qrCodeUrl' | 'ticketCode' | 'status' | 'ownerId'>;

interface ValidationResult {
  success: boolean;
  message: string;
  ticket?: PurchasedTicket;
}

interface AppContextType {
  events: Event[];
  getEventById: (id: string) => Event | undefined;
  updateEvent: (updatedEvent: Event) => Promise<void>;
  addEvent: (newEvent: Omit<Event, 'id'>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  purchasedTickets: PurchasedTicket[];
  validateTicket: (ticketId: string) => Promise<ValidationResult>;
  pendingPurchases: PendingPurchase[];
  addPendingPurchase: (purchaseData: Omit<PendingPurchase, 'id' | 'timestamp' | 'userId'>) => Promise<void>;
  approvePurchase: (purchaseId: string) => Promise<void>;
  rejectPurchase: (purchaseId: string) => Promise<void>;
  completedPurchases: CompletedPurchase[];
  // Auth
  currentUser: User | null | undefined; // undefined means loading
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (userData: Omit<User, 'uid' | 'role'> & {password: string}) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const DEFAULT_SETTINGS: AppSettings = {
    logoUrl: null,
    primaryColor: '#f59e0b',
    backgroundColor: '#111827',
    footerText: `© ${new Date().getFullYear()} EventHive. Todos los derechos reservados.`,
    socialLinks: [],
    paymentQrCodeUrl: null,
};


export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [purchasedTickets, setPurchasedTickets] = useState<PurchasedTicket[]>([]);
  const [pendingPurchases, setPendingPurchases] = useState<PendingPurchase[]>([]);
  const [completedPurchases, setCompletedPurchases] = useState<CompletedPurchase[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);

  // --- Auth Effect ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser({ uid: firebaseUser.uid, ...userDocSnap.data() } as User);
        } else {
           // This case can happen if user exists in Auth but not in Firestore.
           // For simplicity, we log them out. A real app might handle this more gracefully.
           await signOut(auth);
           setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // --- Data Fetching Effects ---
  useEffect(() => {
    const q = collection(db, 'events');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
      setEvents(eventsData);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Admin gets all pending purchases, users only get their own (for future use)
    if (currentUser?.role !== 'admin') {
      setPendingPurchases([]);
      return;
    };
    const q = collection(db, 'pendingPurchases');
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PendingPurchase));
        setPendingPurchases(data);
    });
    return () => unsubscribe();
  }, [currentUser]);

   useEffect(() => {
    if (!currentUser) {
        setPurchasedTickets([]);
        return;
    }
    const q = query(collection(db, "purchasedTickets"), where("ownerId", "==", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PurchasedTicket));
        setPurchasedTickets(data);
    });
    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'global');
    const unsubscribe = onSnapshot(settingsRef, (doc) => {
        if (doc.exists()) {
            setSettings(doc.data() as AppSettings);
        }
    });
    return () => unsubscribe();
  }, []);
  
  // --- Context Functions ---
  const getEventById = (id: string) => events.find(event => event.id === id);

  const addEvent = async (newEventData: Omit<Event, 'id'>) => {
    await addDoc(collection(db, 'events'), newEventData);
  };
  
  const updateEvent = async (updatedEvent: Event) => {
    const { id, ...eventData } = updatedEvent;
    const eventRef = doc(db, 'events', id);
    // Use setDoc with merge to handle both creation (with a known ID) and updates.
    await setDoc(eventRef, eventData, { merge: true });
  };

  const deleteEvent = async (eventId: string) => {
    // Advanced: Also delete associated storage files if any
    const eventToDelete = events.find(e => e.id === eventId);
    if (eventToDelete) {
        const imagesToDelete = [
            eventToDelete.mainImage,
            ...(eventToDelete.carouselImages || []),
            eventToDelete.venueMapImage,
        ].filter(Boolean);

        for (const url of imagesToDelete) {
            try {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
            } catch (error: any) {
                // Ignore "object not found" errors, as the file might have been deleted already or not exist.
                if (error.code !== 'storage/object-not-found') {
                    console.error("Error deleting image from storage:", error);
                }
            }
        }
    }
    await deleteDoc(doc(db, 'events', eventId));
  };
  
  const updateSettings = async (newSettings: AppSettings) => {
    const settingsRef = doc(db, 'settings', 'global');
    await setDoc(settingsRef, newSettings, { merge: true });
  };

  const validateTicket = async (ticketId: string): Promise<ValidationResult> => {
    const ticketRef = doc(db, 'purchasedTickets', ticketId);
    const ticketSnap = await getDoc(ticketRef);
    
    if (!ticketSnap.exists()) {
        return { success: false, message: 'Ticket inválido o no encontrado.' };
    }
    const ticket = { id: ticketSnap.id, ...ticketSnap.data() } as PurchasedTicket;
    if (ticket.status === 'USED') {
        return { success: false, message: 'Este ticket ya ha sido utilizado.', ticket };
    }
    await updateDoc(ticketRef, { status: 'USED' });
    return { success: true, message: 'Ticket validado con éxito.', ticket: {...ticket, status: 'USED'} };
  };

  const addPendingPurchase = async (purchaseData: Omit<PendingPurchase, 'id' | 'timestamp' | 'userId'>) => {
      if (!currentUser) throw new Error("User must be logged in to make a purchase.");
      
      await runTransaction(db, async (transaction) => {
          const eventRef = doc(db, 'events', purchaseData.eventId);
          const eventSnap = await transaction.get(eventRef);
          if (!eventSnap.exists()) throw new Error("Event does not exist!");

          // Add purchase to pending collection
          const pendingPurchaseRef = doc(collection(db, 'pendingPurchases'));
          const newPurchase = {
              ...purchaseData,
              userId: currentUser.uid,
              timestamp: serverTimestamp() 
          };
          transaction.set(pendingPurchaseRef, newPurchase);

          // Mark shapes as RESERVED
          const eventData = eventSnap.data() as Event;
          const newShapes = eventData.venueShapes.map(shape => {
              if (purchaseData.selectedShapes.some(s => s.shapeId === shape.id)) {
                  return { ...shape, status: ShapeStatus.RESERVED };
              }
              return shape;
          });
          transaction.update(eventRef, { venueShapes: newShapes });
      });
  };

 const approvePurchase = async (purchaseId: string) => {
    await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, 'pendingPurchases', purchaseId);
        const purchaseSnap = await transaction.get(purchaseRef);
        if (!purchaseSnap.exists()) throw new Error("Purchase not found");
        
        const purchase = { id: purchaseSnap.id, ...purchaseSnap.data() } as PendingPurchase;
        const eventRef = doc(db, 'events', purchase.eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found");

        const event = { id: eventSnap.id, ...eventSnap.data() } as Event;

        // Generate tickets
        const ticketsToCreate: TicketToCreate[] = [];
        const ticketTypeForPurchase = event.ticketTypes.find(tt => tt.id === purchase.ticketTypeId);
        
        const commonTicketData = {
            eventName: event.name,
            eventDate: event.date,
            eventTime: event.time,
            eventLocation: event.location,
            headerImage: event.ticketDesign.headerImageUrl || event.mainImage,
            ticketDesign: event.ticketDesign,
        };

        if (purchase.selectedShapes.length > 0) {
            for (const selectedShapeInfo of purchase.selectedShapes) {
                const shape = event.venueShapes.find(s => s.id === selectedShapeInfo.shapeId);
                const ticketType = event.ticketTypes.find(t => t.id === shape?.ticketTypeId);
                if (!shape || !ticketType) continue;

                if (selectedShapeInfo.bookingChoice === 'combo' && ticketType.bookingConditions?.combo?.enabled) {
                    ticketsToCreate.push({ ...commonTicketData, holderType: ticketType.bookingConditions.combo.name.toUpperCase(), seatInfo: shape.label });
                } else if (selectedShapeInfo.bookingChoice === 'minTickets' && ticketType.bookingConditions?.minTickets?.enabled) {
                    const quantity = ticketType.bookingConditions.minTickets.quantity;
                    for (let i = 0; i < quantity; i++) {
                        ticketsToCreate.push({ ...commonTicketData, holderType: ticketType.name.toUpperCase(), seatInfo: `${shape.label} (Ticket ${i + 1}/${quantity})` });
                    }
                } else {
                    const numTickets = ticketType.groupSize || 1;
                    for (let i = 0; i < numTickets; i++) {
                        ticketsToCreate.push({ ...commonTicketData, holderType: ticketType.name.toUpperCase(), seatInfo: numTickets > 1 ? `${shape.label} (Ticket ${i + 1}/${numTickets})` : shape.label });
                    }
                }
            }
        } else if (ticketTypeForPurchase) {
            for (let i = 0; i < purchase.generalQuantity; i++) {
                ticketsToCreate.push({ ...commonTicketData, holderType: ticketTypeForPurchase.name.toUpperCase(), seatInfo: `Acceso General` });
            }
        }
        
        for (const ticket of ticketsToCreate) {
             const newTicketRef = doc(collection(db, 'purchasedTickets'));
             const ticketId = newTicketRef.id;
             const newTicket: PurchasedTicket = {
                 ...ticket,
                 id: ticketId,
                 ownerId: purchase.userId,
                 ticketCode: `${ticketId.substring(0, 6)}-${Math.random().toString(36).substring(2, 6)}`.toUpperCase(),
                 qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${ticketId}&bgcolor=ffffff`,
                 status: 'VALID',
             };
             transaction.set(newTicketRef, newTicket);
        }

        // Update shapes to SOLD
        const newShapes = event.venueShapes.map(shape => {
            if (purchase.selectedShapes.some(s => s.shapeId === shape.id)) {
                return { ...shape, status: ShapeStatus.SOLD };
            }
            return shape;
        });
        transaction.update(eventRef, { venueShapes: newShapes });

        // Move purchase to completed history and delete pending
        const completedRef = doc(collection(db, 'completedPurchases'), purchase.id);
        transaction.set(completedRef, { ...purchase, approvalTimestamp: serverTimestamp() });
        transaction.delete(purchaseRef);
    });
  };

  const rejectPurchase = async (purchaseId: string) => {
    await runTransaction(db, async (transaction) => {
        const purchaseRef = doc(db, 'pendingPurchases', purchaseId);
        const purchaseSnap = await transaction.get(purchaseRef);
        if (!purchaseSnap.exists()) throw new Error("Purchase not found");
        
        const purchase = purchaseSnap.data() as PendingPurchase;
        const eventRef = doc(db, 'events', purchase.eventId);
        const eventSnap = await transaction.get(eventRef);
        if (!eventSnap.exists()) throw new Error("Event not found");

        // Revert shapes to AVAILABLE
        const eventData = eventSnap.data() as Event;
        const newShapes = eventData.venueShapes.map(shape => {
            if (purchase.selectedShapes.some(s => s.shapeId === shape.id)) {
                return { ...shape, status: ShapeStatus.AVAILABLE };
            }
            return shape;
        });
        transaction.update(eventRef, { venueShapes: newShapes });

        // Delete pending purchase
        transaction.delete(purchaseRef);
    });
  };

  // --- AUTH FUNCTIONS ---
  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const register = async (userData: Omit<User, 'uid' | 'role'> & {password: string}) => {
    const { email, password, ...rest } = userData;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", user.uid), {
      ...rest,
      email,
      role: 'user' // All new registrations are users
    });
  };

  return (
    <AppContext.Provider value={{ 
        events, getEventById, updateEvent, addEvent, deleteEvent, 
        settings, updateSettings, 
        purchasedTickets, validateTicket, 
        pendingPurchases, addPendingPurchase, approvePurchase, rejectPurchase, 
        completedPurchases, 
        currentUser, login, logout, register 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};