import { Toaster } from "@/components/ui/sonner";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider"

export const metadata = {
    title: "Shutterdev",
    description: "Self-hosted photo gallery",
};

export default function RootLayout({ children, modal }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <link rel="preconnect" href={`${process.env.R2_BUCKET_PUBLIC_URL}`}/>
            <body>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                    {modal}
                    <Toaster/>
                </ThemeProvider>
            </body>
        </html>
    );
}
