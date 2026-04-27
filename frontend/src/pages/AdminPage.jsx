import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfigStore } from '../stores/useConfigStore';
import CollapsibleSection from '../components/admin/CollapsibleSection';
import LLMConfigSection from '../components/admin/LLMConfigSection';
import SystemPromptSection from '../components/admin/SystemPromptSection';
import DimensionsSection from '../components/admin/DimensionsSection';
import TeaFieldsSection from '../components/admin/TeaFieldsSection';
import DerivedMetricsSection from '../components/admin/DerivedMetricsSection';
import BackupSection from '../components/admin/BackupSection';
import ChangePasswordSection from '../components/admin/ChangePasswordSection';
import UserManagementSection from '../components/admin/UserManagementSection';

export default function AdminPage() {
  const { config, loadConfig, saveConfig, testConfig } = useConfigStore();
  const navigate = useNavigate();
  const [teaFields, setTeaFields] = useState([]);

  const handleFieldsLoaded = useCallback((fields) => { setTeaFields(fields); }, []);

  useEffect(() => { loadConfig(); }, [loadConfig]);

  return (
    <>
      <div style={{ position: 'relative', marginBottom: 4 }}>
        <h1>🍵 后台管理</h1>
      </div>
      <div className="subtitle">
        <a href="/" onClick={e => { e.preventDefault(); navigate('/'); }} style={{ color: '#8b5e3c', fontWeight: 600 }}>
          ← 返回品鉴页面
        </a>
      </div>

      <CollapsibleSection title="🤖 大模型配置">
        <LLMConfigSection config={config} onSave={saveConfig} onTest={testConfig} />
      </CollapsibleSection>
      <CollapsibleSection title="📝 系统提示词">
        <SystemPromptSection config={config} />
      </CollapsibleSection>
      <CollapsibleSection title="📊 评分维度配置">
        <DimensionsSection />
      </CollapsibleSection>
      <CollapsibleSection title="🏷 茶样字段配置">
        <TeaFieldsSection onFieldsLoaded={handleFieldsLoaded} />
      </CollapsibleSection>
      <CollapsibleSection title="📐 派生指标配置">
        <DerivedMetricsSection teaFields={teaFields} />
      </CollapsibleSection>
      <CollapsibleSection title="🔑 修改密码">
        <ChangePasswordSection />
      </CollapsibleSection>
      <CollapsibleSection title="👤 用户管理">
        <UserManagementSection />
      </CollapsibleSection>
      <CollapsibleSection title="💾 数据管理">
        <BackupSection />
      </CollapsibleSection>
    </>
  );
}
