import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      position="top-center"
      gap={8}
      visibleToasts={3}
      toastOptions={{
        duration: 2800,
        style: {
          background: "rgba(30,30,32,0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          border: "1px solid rgba(255,255,255,0.10)",
          borderRadius: "16px",
          color: "#fff",
          padding: "12px 16px",
          fontSize: "14px",
          fontWeight: "600",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.06) inset",
          minWidth: "200px",
          maxWidth: "340px",
        },
        classNames: {
          toast: "iphone-toast",
          title: "iphone-toast-title",
          icon: "iphone-toast-icon",
          success: "iphone-toast-success",
          error: "iphone-toast-error",
          info: "iphone-toast-info",
        },
      }}
      style={
        {
          "--normal-bg": "rgba(30,30,32,0.92)",
          "--normal-border": "rgba(255,255,255,0.10)",
          "--normal-text": "#ffffff",
        } as React.CSSProperties
      }
      {...props}
    />

  );
};

export { Toaster };
