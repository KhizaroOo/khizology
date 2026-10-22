import type {ReactNode} from 'react';
import type {InfoooWorld} from '../../../data/infooo';
import {InfoooWorldShell,InfoooSourceDisclosure} from '../InfoooWorldFoundation';
import GridStory from './GridStory';
import './grid.css';
export default function LivingGrid({world,children}:{world:InfoooWorld;children?:ReactNode}){
 return <div className="living-grid"><InfoooWorldShell world={world} stage={<GridStory/>}/><details className="grid-more k-container"><summary>How it works & sources</summary><InfoooSourceDisclosure knowledge={world.knowledge}/>{children}</details></div>;
}
