export interface ArtistDoc {
  walletAddress: string;
  stageName: string;
  bio: string;
  categories: string[];
  hardLimits: string;
  status: 'pending_verification' | 'active' | 'suspended' | 'banned';
  appliedAt: string;
  approvedAt: string | null;
  totalEarned: number;
  withdrawable: number;
  referredBy: string;
  referralCount: number;
  healthVerified: boolean;
  healthVerifiedUntil: string | null;
  profileHash: string;
}

export interface ContentDoc {
  artistWallet: string;
  category: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  storagePath: string;
  contentType: string;
  isVideo: boolean;
}

export interface TaskDoc {
  artistWallet: string;
  taskId: number;
  title: string;
  description: string;
  requirements: string[];
  payout: number;
  status: 'locked' | 'available' | 'submitted' | 'in_review' | 'approved' | 'rejected';
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionNote: string;
  submittedFiles: string[];
}

export interface SubscriberDoc {
  walletAddress: string;
  expiry: string;
  referredBy: string;
  referralCount: number;
  subscribedAt: string;
}

export interface EngagementDoc {
  subscriberWallet: string;
  contentId: string;
  artistWallet: string;
  type: 'view' | 'like';
  timestamp: string;
  month: string; // YYYY-MM
}

export interface DistributionDoc {
  month: string;
  totalPool: number;
  artistPayouts: { wallet: string; amount: number; views: number; likes: number; share: number }[];
  distributedAt: string;
  txHash: string;
}

export interface LiveRoom {
  id: string;
  title: string;
  artist1Wallet: string;
  artist1Name: string;
  artist2Wallet: string | null;
  artist2Name: string | null;
  status: 'waiting' | 'live' | 'ended';
  audienceCount: number;
  price: number;
  createdAt: string;
  scriptId: string | null;
}

export interface CollectionItem {
  contentId: string;
  artistWallet: string;
  artistName: string;
  category: string;
  purchasedAt: string;
}

export interface ChatMessage {
  sender: string;
  text: string;
  timestamp: number;
  isArtist: boolean;
}

export interface FeedItem {
  contentId: string;
  artistWallet: string;
  artistName: string;
  category: string;
  price: number;
}
