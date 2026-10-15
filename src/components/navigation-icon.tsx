import { House,Compass,ChartNoAxesCombined,FlaskConical,Database,CircleHelp,ChartCandlestick } from "lucide-react";
const icons={Overview:House,Equities:ChartCandlestick,Explore:Compass,Charts:ChartNoAxesCombined,Research:FlaskConical,Data:Database,Help:CircleHelp};
export function NavigationIcon({name}:{name:string}){const Icon=icons[name as keyof typeof icons]??FlaskConical;return <Icon size={20} strokeWidth={1.7} aria-hidden="true"/>;}
