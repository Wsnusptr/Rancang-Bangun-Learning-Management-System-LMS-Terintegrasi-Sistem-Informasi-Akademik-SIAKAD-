import PmbInfoPanel from '@/components/student/PmbInfoPanel'
import AnnouncementFooter from '@/components/layout/AnnouncementFooter'
import PmbFaqSection from '@/components/student/PmbFaqSection'

export default function PengumumanPmbPage() {
  return (
    <div className="pb-8 space-y-4 mt-2">
      <PmbInfoPanel />
      <PmbFaqSection />
      <AnnouncementFooter />
    </div>
  )
}
