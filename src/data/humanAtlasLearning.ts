import type { InfoooEntity, InfoooGuide, InfoooRelationship } from './infooo';

export const humanAtlasLearningSources = [
  { label: 'NIH: How Blood Flows through the Heart', url: 'https://www.nhlbi.nih.gov/health/heart/blood-flow' },
  { label: 'BodyParts3D source and model license', url: 'https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html' },
] as const;

export const humanAtlasEntities: InfoooEntity[] = [
  { id: 'heart', title: 'Heart', layerId: 'cardiac', knowledge: { shortExplanation: 'A muscular organ that pumps blood.', sources: [humanAtlasLearningSources[0]] } },
  { id: 'right-lung', title: 'Right lung', layerId: 'respiratory', knowledge: { shortExplanation: 'A lung where blood releases carbon dioxide and picks up oxygen.', sources: [humanAtlasLearningSources[0]] } },
  { id: 'pulmonary-trunk', title: 'Pulmonary trunk', layerId: 'arterial', knowledge: { shortExplanation: 'A route carrying blood away from the heart toward the lungs.', sources: [humanAtlasLearningSources[0]] } },
  { id: 'pulmonary-vein', title: 'Pulmonary vein', layerId: 'venous', knowledge: { shortExplanation: 'A route returning blood from the lungs to the heart.', sources: [humanAtlasLearningSources[0]] } },
  { id: 'aorta', title: 'Aorta', layerId: 'arterial', knowledge: { shortExplanation: 'The main artery carrying blood away from the heart toward the body.', sources: [humanAtlasLearningSources[0]] } },
  { id: 'inferior-vena-cava', title: 'Inferior vena cava', layerId: 'venous', knowledge: { shortExplanation: 'A large vein returning blood from the lower body to the heart.', sources: [humanAtlasLearningSources[0]] } },
];

export const humanAtlasRelationships: InfoooRelationship[] = [
  { id: 'heart-to-pulmonary-trunk', from: 'heart', type: 'flows-to', to: 'pulmonary-trunk', explanation: 'Blood leaves the right side of the heart toward the lungs.' },
  { id: 'pulmonary-trunk-to-lung', from: 'pulmonary-trunk', type: 'flows-to', to: 'right-lung', explanation: 'This route leads from the heart toward the lungs.' },
  { id: 'lung-to-pulmonary-vein', from: 'right-lung', type: 'flows-to', to: 'pulmonary-vein', explanation: 'Blood returns from the lungs through pulmonary veins.' },
  { id: 'heart-to-aorta', from: 'heart', type: 'flows-to', to: 'aorta', explanation: 'Blood leaves the left side of the heart through the aorta toward the body.' },
  { id: 'vena-cava-to-heart', from: 'inferior-vena-cava', type: 'flows-to', to: 'heart', explanation: 'Blood from the body returns to the right side of the heart through large veins.' },
];

export const followTheBloodGuide: InfoooGuide = {
  id: 'follow-the-blood', title: 'Follow the Blood',
  steps: ['heart', 'pulmonary-trunk', 'right-lung', 'pulmonary-vein', 'heart', 'aorta', 'inferior-vena-cava'],
};
