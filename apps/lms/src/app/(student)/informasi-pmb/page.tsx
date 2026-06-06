import PmbInfoPanel from '@/components/student/PmbInfoPanel'
import PmbInteractivePortal from '@/components/student/PmbInteractivePortal'
import PmbFaqSection from '@/components/student/PmbFaqSection'
import AnnouncementFooter from '@/components/layout/AnnouncementFooter'

export default function InformasiPmbPage() {
  return (
    <div className="pb-8">
      <PmbInfoPanel />
      <div className="mt-6">
        <PmbInteractivePortal />
      </div>
      <div className="mt-6 px-1">
        <PmbFaqSection />
      </div>
      <AnnouncementFooter />
    </div>
  )
}
