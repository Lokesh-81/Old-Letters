import React from 'react';
import { LetterTemplate } from '../../types/letter';
import { TEMPLATES } from '../../data/mockData';
import { StationeryGallery } from './StationeryGallery';

interface TemplateSelectorProps {
  selectedTemplateId: string;
  onSelectTemplate: (templateId: string) => void;
  onContinue: () => void;
  onBack: () => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  selectedTemplateId,
  onSelectTemplate,
  onContinue,
  onBack,
}) => {
  return (
    <div className="py-2">
      <StationeryGallery
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={(tpl) => onSelectTemplate(tpl.id)}
        onConfirmStationery={(tpl) => {
          onSelectTemplate(tpl.id);
          onContinue();
        }}
        onBackToCompose={onBack}
      />
    </div>
  );
};
