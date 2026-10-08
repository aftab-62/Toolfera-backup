/* Tool Fera home is rendered on the server. */
import { HomePage } from '@/components/site/home-page';
import { seo } from '@/lib/seo';
export const metadata = seo('Free Online Tools — PDFs, Images, Calculators & Code', 'Use free PDF, image, student, calculator, text, developer and generator tools. Process files and inputs on your device without an account.', '/');
export default function Home(){ return <HomePage/>; }
