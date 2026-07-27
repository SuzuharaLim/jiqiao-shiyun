// 分頁根畫面 + 堆疊（詳情）畫面註冊表
import Feed from './Feed.jsx'
import Explore from './Explore.jsx'
import Create from './Create.jsx'
import Almanac from './Almanac.jsx'
import Profile from './Profile.jsx'

import AIChat from './AIChat.jsx'
import Checkout from './Checkout.jsx'
import WorkDetail from './WorkDetail.jsx'
import PostDetail from './PostDetail.jsx'
import NewPost from './NewPost.jsx'
import MakeCalendar from './MakeCalendar.jsx'
import CalendarPreview from './CalendarPreview.jsx'
import MyProjects from './MyProjects.jsx'
import Deities from './Deities.jsx'
import Zodiac from './Zodiac.jsx'
import Dream from './Dream.jsx'
import NameFortune from './NameFortune.jsx'
import Matchmaking from './Matchmaking.jsx'
import Subscription from './Subscription.jsx'
import Wallet from './Wallet.jsx'
import Notifications from './Notifications.jsx'
import DMs from './DMs.jsx'
import Settings from './Settings.jsx'
import Records from './Records.jsx'
import CreatorConsole from './CreatorConsole.jsx'
import Store from './Store.jsx'
import Orders from './Orders.jsx'
import Scan from './Scan.jsx'
import Camera from './Camera.jsx'
import TodayShots from './TodayShots.jsx'
import AlmanacDay from './AlmanacDay.jsx'
import YearAlmanac from './YearAlmanac.jsx'
import { FoodTaboo, Units, GanzhiTable } from './AppendixScreens.jsx'
import Challenges from './Challenges.jsx'
import CreatorPage from './CreatorPage.jsx'
import FollowList from './FollowList.jsx'
import Leaderboard from './Leaderboard.jsx'
import PrePlan from './PrePlan.jsx'
import EditProfile from './EditProfile.jsx'
import About from './About.jsx'
import AccountSecurity from './AccountSecurity.jsx'
import Admin from './Admin.jsx'
import { Privacy, Terms, Contact } from './LegalScreens.jsx'
import { Proverbs, Festivals, Flowers, Ingredients, SolarTerms, Bone } from './InfoScreens.jsx'

export const ROOTS = [Feed, Explore, Create, Almanac, Profile]

export const SCREENS = {
  aiChat: AIChat,
  checkout: Checkout,
  workDetail: WorkDetail,
  postDetail: PostDetail,
  newPost: NewPost,
  makeCalendar: MakeCalendar,
  calendarPreview: CalendarPreview,
  myProjects: MyProjects,
  deities: Deities,
  zodiac: Zodiac,
  dream: Dream,
  nameFortune: NameFortune,
  matchmaking: Matchmaking,
  bone: Bone,
  proverbs: Proverbs,
  festivals: Festivals,
  flowers: Flowers,
  ingredients: Ingredients,
  solarterms: SolarTerms,
  subscription: Subscription,
  wallet: Wallet,
  notifications: Notifications,
  dms: DMs,
  settings: Settings,
  records: Records,
  creatorConsole: CreatorConsole,
  store: Store,
  orders: Orders,
  scan: Scan,
  camera: Camera,
  todayShots: TodayShots,
  almanacDay: AlmanacDay,
  yearAlmanac: YearAlmanac,
  foodTaboo: FoodTaboo,
  units: Units,
  ganzhiTable: GanzhiTable,
  challenges: Challenges,
  challengesBoard: Leaderboard,
  creatorPage: CreatorPage,
  followList: FollowList,
  prePlan: PrePlan,
  editProfile: EditProfile,
  about: About,
  accountSecurity: AccountSecurity,
  admin: Admin,
  privacy: Privacy,
  terms: Terms,
  contact: Contact,
}
