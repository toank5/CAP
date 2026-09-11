import { useEffect, useState } from 'react'
import { ShieldAlert, ShieldCheck, ArrowRight } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { navigate } from '@/router'
import { subscribeEkycGate, closeEkycGateModal } from '@/lib/ekyc-gate'

export function EkycGateModal() {
  const [open, setOpen] = useState(false)
  const [projectId, setProjectId] = useState<string | undefined>()

  useEffect(() => {
    return subscribeEkycGate((state) => {
      setOpen(state.open)
      setProjectId(state.projectId)
    })
  }, [])

  const handleVerifyNow = () => {
    if (projectId) {
      sessionStorage.setItem('createApplicationProjectId', projectId)
      sessionStorage.setItem('projectId', projectId)
    }
    setOpen(false)
    closeEkycGateModal()
    navigate('verify-identity')
  }

  const handleClose = () => {
    setOpen(false)
    closeEkycGateModal()
  }

  return (
    <Modal open={open} onClose={handleClose} size="sm">
      <div className="text-center space-y-3 py-1">
        {/* Header Icon */}
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 ring-4 ring-amber-50 dark:ring-amber-950/30">
          <ShieldAlert className="h-5 w-5" />
        </div>

        {/* Title & Desc */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Xác minh danh tính (eKYC)
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Bạn cần hoàn tất định danh CCCD gắn chip trước khi đăng ký nộp hồ sơ mua Nhà ở Xã hội.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-1 flex flex-col gap-2">
          <Button
            size="sm"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl shadow-sm text-xs cursor-pointer flex items-center justify-center gap-1.5"
            onClick={handleVerifyNow}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Xác minh ngay
            <ArrowRight className="h-3.5 w-3.5 ml-0.5" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full rounded-xl border-slate-200 text-slate-600 font-semibold hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 text-xs cursor-pointer py-1.5"
            onClick={handleClose}
          >
            Để sau
          </Button>
        </div>
      </div>
    </Modal>
  )
}
