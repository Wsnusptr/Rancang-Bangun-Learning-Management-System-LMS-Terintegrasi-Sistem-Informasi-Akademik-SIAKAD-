import PmbInfoPanel from '@/components/student/PmbInfoPanel'
import PmbInteractivePortal from '@/components/student/PmbInteractivePortal'
import AnnouncementFooter from '@/components/layout/AnnouncementFooter'

export default function InformasiPmbPage() {
  return (
    <div className="pb-8">
      <PmbInfoPanel />
      <PmbInteractivePortal />
      <AnnouncementFooter />
    </div>
  )
}
