import { IconName } from '../components/Icon';

export type Service = {
  id: string;
  title: string;
  short: string;
  detail: string;
  icon: IconName;
  points: string[];
};

export const SERVICES: Service[] = [
  {
    id: 'bike',
    title: 'Bike delivery',
    short: 'Fast door-to-door for documents, food and small parcels.',
    detail: 'Our riders cut through traffic to get small items where they need to be, quickly.',
    icon: 'bicycle',
    points: ['Documents, food and parcels', 'Live tracking from pickup to drop-off', 'Delivery PIN for safe handover'],
  },
  {
    id: 'car',
    title: 'Car and van delivery',
    short: 'Bigger loads, safely handled and tracked end to end.',
    detail: 'Choose a car or van for larger packages, multiple boxes or fragile goods.',
    icon: 'car',
    points: ['Larger and fragile items', 'Vehicle matched to your package', 'Photo and signature on delivery'],
  },
  {
    id: 'scheduled',
    title: 'Scheduled delivery',
    short: 'Book ahead for a time that suits you.',
    detail: 'Plan pickups for later today or days ahead. We assign a rider close to the time.',
    icon: 'calendar',
    points: ['Pick a date and time window', 'Reminders before pickup', 'Change or cancel from the app'],
  },
  {
    id: 'multi',
    title: 'Multi-stop delivery',
    short: 'One pickup, several drop-offs, one price.',
    detail: 'Send to several recipients in one booking and follow every stop on the map.',
    icon: 'layers',
    points: ['Add several drop-off points', 'One fare for the whole run', 'Status updates for each stop'],
  },
  {
    id: 'business',
    title: 'Business accounts',
    short: 'Repeat deliveries, one monthly invoice.',
    detail: 'For shops and companies that send often. Invite your team and keep billing in one place.',
    icon: 'briefcase',
    points: ['Several users on one account', 'Consolidated billing and statements', 'Optional API access'],
  },
];

export const STEPS = [
  { title: 'Set your route', text: 'Choose pickup and drop-off on the map and add package details.' },
  { title: 'See your price', text: 'Check the fare and arrival time before you confirm.' },
  { title: 'Follow your rider', text: 'Watch them move live and get alerts as they get close.' },
  { title: 'Hand over safely', text: 'Give the recipient the delivery PIN, then rate your rider.' },
];

export const PROMISES: { title: string; text: string; icon: IconName }[] = [
  { title: 'Safe', text: 'Verified riders and a delivery PIN make sure packages reach the right person.', icon: 'shield-checkmark' },
  { title: 'Dependable', text: 'Live ETAs and alerts keep you informed at every stage.', icon: 'time' },
  { title: 'Reliable', text: 'Photo and signature proof for every completed delivery.', icon: 'camera' },
];

export const TRACK_STAGES = [
  'Order placed',
  'Order confirmed',
  'Driver assigned',
  'Heading to pickup',
  'Package picked up',
  'In transit',
  'Arrived at destination',
  'Delivered',
];
