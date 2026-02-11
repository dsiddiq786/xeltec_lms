
import { useToast, Toast, ToastTitle, ToastDescription, ToastViewport, ToastProvider, ToastClose } from "@/components/ui/toast"
import { useToast as useToastHook } from "@/components/ui/use-toast"

export function Toaster() {
    const { toasts } = useToastHook()

    return (
        <ToastProvider>
            {toasts.map(function ({ id, title, description, action, ...props }) {
                return (
                    <Toast key={id} {...props}>
                        <div className="grid gap-1">
                            {title && <ToastTitle>{title}</ToastTitle>}
                            {description && (
                                <ToastDescription>{description}</ToastDescription>
                            )}
                        </div>
                        {action}
                        <ToastClose />
                    </Toast>
                )
            })}
            <ToastViewport />
        </ToastProvider>
    )
}
