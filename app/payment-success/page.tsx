import Link from "next/link";
import { 
  CreditCardCheckIcon, 
  CopyIcon, 
  MailIcon, 
  DownloadIcon, 
  ArrowLeftIcon 
} from "../components/icons";

export default function PaymentSuccessPage() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[#FDF1D9] overflow-hidden flex items-center justify-center p-4">
      {/* Fixed Brick Pattern Background */}
      <div 
        className="absolute inset-0 opacity-[0.2] pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='120' height='80' viewBox='0 0 120 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23C2A38A' stroke-width='1.5'%3E%3Cpath d='M0 0h120M0 40h120M0 80h120' /%3E%3Cpath d='M30 0v15M90 0v15M0 40v15M60 40v15M120 40v15M30 80v-15M90 80v-15' /%3E%3C/g%3E%3C/svg%3E")`,
          backgroundSize: "240px 160px",
        }}
      />

      {/* Main Content Container - Scaling based on viewport height */}
      <div className="relative z-10 w-full flex justify-center py-4 transition-transform duration-300
        [transform:scale(0.7)] sm:[transform:scale(0.8)] md:[transform:scale(0.9)] lg:[transform:scale(1)]
        [@media(max-height:700px)]:[transform:scale(0.7)]
        [@media(max-height:600px)]:[transform:scale(0.6)]
        [@media(max-height:500px)]:[transform:scale(0.5)]
      ">
        <div className="w-full max-w-[440px] rounded-[32px] bg-white p-8 md:p-10 shadow-[0_32px_80px_-16px_rgba(0,0,0,0.15)] border border-white/20 flex flex-col shrink-0">
          
          {/* Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="flex items-center gap-3 mb-8">
              <img src="/figma/suvcraft-logo.png" alt="SUVCRAFT Logo" className="h-[52px] w-auto" />
              <span className="font-bruno text-[32px] font-bold leading-none tracking-tight text-brand-purple">
                SUVCRAFT
              </span>
            </div>
            
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E5F7ED] text-[#00B140] mb-4 shadow-sm">
              <CreditCardCheckIcon className="h-6 w-6" />
            </div>
            
            <h1 className="text-[28px] font-bold text-[#00B140] mb-2 tracking-tight text-center">
              Payment Successful!
            </h1>
            
            <p className="text-[14px] text-[#8c8c8c] text-center max-w-[320px] leading-relaxed">
              Your payment has been processed successfully.
              You will receive a confirmation email shortly.
            </p>
          </div>

          {/* Receipt Details Box */}
          <div className="rounded-[24px] bg-[#f9fafb] p-6 mb-6 border border-[#f0f0f0]">
            {/* Amount */}
            <div className="flex justify-between items-center mb-4">
              <span className="text-[14px] text-[#6b6b6b] font-medium">Amount</span>
              <span className="text-[18px] font-bold text-ink">$149.99</span>
            </div>
            
            <hr className="border-t border-dashed border-[#e5e7eb] mb-4" />
            
            <div className="flex flex-col gap-3">
              {/* Transaction ID */}
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#8c8c8c]">Transaction ID</span>
                <div className="flex items-center gap-2">
                  <span className="text-[12px] font-bold text-ink bg-white px-3 py-1 rounded-lg border border-[#e5e7eb] shadow-sm min-w-[110px] text-center">TXN-789123456</span>
                  <button aria-label="Copy transaction ID" className="text-[#9ca3af] hover:text-ink transition-colors">
                    <CopyIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              
              {/* Payment Method */}
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#8c8c8c]">Payment Method</span>
                <span className="text-[13px] font-semibold text-ink">**** 4242</span>
              </div>
              
              {/* Date */}
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#8c8c8c]">Date</span>
                <span className="text-[13px] font-semibold text-ink">Dec 15, 2024</span>
              </div>
              
              {/* Merchant */}
              <div className="flex justify-between items-center">
                <span className="text-[13px] text-[#8c8c8c]">Merchant</span>
                <span className="text-[13px] font-semibold text-ink">TechStore Pro</span>
              </div>
            </div>
          </div>

          {/* Email Confirmation */}
          <div className="flex items-center justify-center gap-2.5 rounded-xl bg-[#f0f7ff] py-3 px-4 mb-6 border border-[#e0efff]">
            <MailIcon className="h-4 w-4 text-[#4a6b8a]" />
            <span className="text-[13px] font-medium text-[#4a6b8a]">Receipt sent to customer@example.com</span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-3 mb-6">
            <button className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[#030712] text-[14px] font-bold text-white hover:bg-black transition-all shadow-md">
              <DownloadIcon className="h-4 w-4" />
              Download Receipt
            </button>
            
            <Link 
              href="/"
              className="flex h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white text-[14px] font-bold text-ink hover:bg-slate-50 transition-all shadow-sm"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Return to Store
            </Link>
          </div>

          {/* Support Text */}
          <div className="text-center">
            <p className="text-[12px] font-medium text-[#94a3b8]">
              Need help? Contact support at <span className="text-brand-purple cursor-pointer hover:underline">support@suvcraft.com</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
