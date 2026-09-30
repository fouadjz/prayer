import { NavLink } from 'react-router-dom'
import { Icon } from '../../shared/ui/Icon'

export function About() {
  return <div className="page-content about-page"><span className="about-symbol">✳</span><p className="eyebrow">عن التطبيق</p><h2>فاتتني صلاة</h2><p>تطبيق بسيط لمساعدتك على متابعة الصلوات التي تريد قضاءها، خطوة هادئة في كل مرة.</p><p className="about-privacy">الخصوصية أولًا.<br />كل بياناتك تبقى على هذا الجهاز.</p><NavLink to="/settings" className="text-button">العودة إلى الإعدادات <Icon name="arrow" /></NavLink></div>
}
