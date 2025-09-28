export interface TicketType {
  id: string;
  name: string;
  price: number;
  fee: number;
  discount: number;
  courtesy: boolean;
  color: string;
  bookingRules?: string; // e.g., "This table must be purchased as a whole."
  groupSize?: number;    // e.g., 4, for a table of 4 people
  bookingConditions?: BookingConditions;
}

export enum ShapeStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  SOLD = 'SOLD',
  SELECTED = 'SELECTED', // Only used client-side
}

export type ShapeType = 'rect' | 'circle' | 'polygon';

export interface BookingConditionMinTickets {
  enabled: boolean;
  quantity: number;
}
export interface BookingConditionCombo {
  enabled: boolean;
  name: string;
  price: number;
}
export interface BookingConditions {
  minTickets?: BookingConditionMinTickets;
  combo?: BookingConditionCombo;
}

export interface BaseShape {
  id: string; // User-defined ID like "A-12"
  label: string; // The text to display on the shape
  type: ShapeType;
  ticketTypeId: string;
  // FIX: Replaced Exclude with an explicit union to resolve type inference issues in mockData.ts.
  status: ShapeStatus.AVAILABLE | ShapeStatus.RESERVED | ShapeStatus.SOLD;
}

export interface RectShape extends BaseShape {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CircleShape extends BaseShape {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: { x: number; y: number }[];
}

export type VenueShape = RectShape | CircleShape | PolygonShape;

export interface TicketDesign {
  brandColor: string;
  headerImageUrl: string | null;
  brandLogoUrl: string | null;
}

export interface Event {
  id:string;
  name: string;
  date: string;
  time: string;
  description: string;
  mainImage: string;
  carouselImages: string[];
  ticketTypes: TicketType[];
  venueMapImage: string | null;
  venueShapes: VenueShape[]; // Replaces mapHotspots
  reservationDetails: string;
  location: string;
  ticketDesign: TicketDesign;
  salesEnabled?: boolean;
}


export interface SocialLink {
  id: string;
  platform: string;
  url: string;
  iconUrl: string | null;
}

export interface AppSettings {
  logoUrl: string | null;
  primaryColor: string;
  backgroundColor: string;
  footerText: string;
  socialLinks: SocialLink[];
  paymentQrCodeUrl: string | null;
}

export interface PurchasedTicket {
    id: string;
    ownerId: string; // Firebase user UID
    eventName: string;
    eventDate: string;
    eventTime: string;
    eventLocation: string;
    qrCodeUrl: string;
    ticketCode: string;
    holderType: string; // e.g. STAFF
    ticketDesign: TicketDesign;
    headerImage: string;
    seatInfo?: string; // e.g. "Mesa T1, Asiento 3"
    status: 'VALID' | 'USED';
}

export interface SelectedShapeInfo {
    shapeId: string;
    bookingChoice?: 'minTickets' | 'combo';
}

export interface PendingPurchase {
    id: string;
    userId: string;
    eventId: string;
    ticketTypeId: string;
    selectedShapes: SelectedShapeInfo[]; // For map-based selections
    generalQuantity: number; // For general admission
    totalPrice: number;
    timestamp: number; // Firestore server timestamp would be better
}

export interface CompletedPurchase extends PendingPurchase {
    approvalTimestamp: number;
}

export interface User {
  uid: string; // Firebase Auth UID
  username: string;
  email: string;
  phone: string;
  role: 'user' | 'admin';
}