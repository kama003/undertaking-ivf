import { db } from '../lib/firebase';
import { collection, doc, getDocs, updateDoc, deleteDoc, writeBatch, query, orderBy, getDoc, setDoc } from 'firebase/firestore';
import { UndertakingData, DocumentStatus, UserRole, SalesRecord, SalesMonth } from '../types';


const COLLECTION_NAME = 'undertakings';
const undertakingsCollection = collection(db, COLLECTION_NAME);

export const firebaseService = {
  async fetchUndertakings(): Promise<UndertakingData[]> {
    try {
      const q = query(undertakingsCollection, orderBy('generatedDate', 'desc'));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as UndertakingData);
    } catch (error) {
      console.error("Error fetching undertakings:", error);
      return [];
    }
  },

  async createUndertakings(docs: UndertakingData[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      docs.forEach(data => {
        const docRef = doc(undertakingsCollection, data.id);
        batch.set(docRef, data);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error creating bulk undertakings:", error);
      throw error;
    }
  },

  async updateUndertakingStatus(id: string, status: DocumentStatus): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await updateDoc(docRef, { status });
    } catch (error) {
      console.error("Error updating undertaking status:", error);
      throw error;
    }
  },

  async bulkUpdateStatus(ids: string[], status: DocumentStatus): Promise<void> {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.update(docRef, { status });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error bulk updating status:", error);
      throw error;
    }
  },

  async deleteUndertaking(id: string): Promise<void> {
    try {
      const docRef = doc(db, COLLECTION_NAME, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error("Error deleting undertaking:", error);
      throw error;
    }
  },

  async bulkDelete(ids: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      ids.forEach(id => {
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.delete(docRef);
      });
      await batch.commit();
    } catch (error) {
      console.error("Error bulk deleting:", error);
      throw error;
    }
  },

  async getUserRole(uid: string, email?: string | null): Promise<UserRole> {
    try {
      const docRef = doc(db, 'users', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return (data.role as UserRole) || 'viewer';
      }
      
      // Auto-create user profile document for backward compatibility / existing Auth-only users
      let defaultRole: UserRole = 'viewer';
      if (email && email.toLowerCase().includes('admin')) {
        defaultRole = 'admin';
      }
      
      await setDoc(docRef, {
        uid,
        email: email || '',
        role: defaultRole,
        createdAt: new Date().toISOString()
      });
      return defaultRole;
    } catch (error) {
      console.error("Error getting user role:", error);
      return 'viewer';
    }
  },

  async createUserProfile(uid: string, email: string, role: UserRole): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, {
        uid,
        email,
        role,
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error creating user profile:", error);
      throw error;
    }
  },

  async updateUserRole(uid: string, role: UserRole): Promise<void> {
    try {
      const docRef = doc(db, 'users', uid);
      await setDoc(docRef, { role }, { merge: true });
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  },

  // --- Sales Features ---

  async fetchSalesRecords(monthKey: string): Promise<SalesRecord[]> {
    try {
      const q = query(collection(db, 'salesRecords'), orderBy('dateIssued', 'desc'));
      const querySnapshot = await getDocs(q);
      const allRecords = querySnapshot.docs.map(doc => doc.data() as SalesRecord);
      return allRecords.filter(r => r.monthKey === monthKey);
    } catch (error) {
      console.error("Error fetching sales records:", error);
      return [];
    }
  },

  async fetchSalesMonthStatus(monthKey: string): Promise<SalesMonth | null> {
    try {
      const docRef = doc(db, 'salesMonths', monthKey);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as SalesMonth;
      }
      return null;
    } catch (error) {
      console.error("Error fetching sales month status:", error);
      return null;
    }
  },

  async lockSalesMonth(monthKey: string): Promise<void> {
    try {
      const docRef = doc(db, 'salesMonths', monthKey);
      await setDoc(docRef, { monthKey, isLocked: true, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (error) {
      console.error("Error locking sales month:", error);
      throw error;
    }
  },

  async mergeSalesRecords(records: SalesRecord[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      records.forEach(data => {
        const docRef = doc(db, 'salesRecords', data.id);
        batch.set(docRef, data, { merge: true });
      });
      await batch.commit();
    } catch (error) {
      console.error("Error merging bulk sales records:", error);
      throw error;
    }
  }
};

