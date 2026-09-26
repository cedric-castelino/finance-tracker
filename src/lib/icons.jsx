import {
  ShoppingCartIcon, ShoppingBagIcon, TruckIcon, ArrowPathIcon, BoltIcon, HeartIcon, PaperAirplaneIcon,
  GiftIcon, BookOpenIcon, EllipsisHorizontalIcon, BriefcaseIcon, BuildingLibraryIcon, ArrowTrendingUpIcon,
  ReceiptRefundIcon, HomeIcon, FilmIcon, DevicePhoneMobileIcon, SparklesIcon, AcademicCapIcon, WrenchIcon,
  CakeIcon, BeakerIcon, CreditCardIcon, TagIcon, MusicalNoteIcon, UserGroupIcon, CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

export const CATEGORY_ICONS = {
  food: CakeIcon,
  cart: ShoppingCartIcon,
  drink: BeakerIcon,
  bag: ShoppingBagIcon,
  car: TruckIcon,
  repeat: ArrowPathIcon,
  bolt: BoltIcon,
  heart: HeartIcon,
  plane: PaperAirplaneIcon,
  gift: GiftIcon,
  book: BookOpenIcon,
  dots: EllipsisHorizontalIcon,
  briefcase: BriefcaseIcon,
  bank: BuildingLibraryIcon,
  trend: ArrowTrendingUpIcon,
  refund: ReceiptRefundIcon,
  home: HomeIcon,
  film: FilmIcon,
  phone: DevicePhoneMobileIcon,
  sparkles: SparklesIcon,
  school: AcademicCapIcon,
  wrench: WrenchIcon,
  card: CreditCardIcon,
  tag: TagIcon,
  music: MusicalNoteIcon,
  people: UserGroupIcon,
  dollar: CurrencyDollarIcon,
};

export function CategoryIcon({ icon, className = 'h-5 w-5' }) {
  const Icon = CATEGORY_ICONS[icon] || TagIcon;
  return <Icon className={className} />;
}
