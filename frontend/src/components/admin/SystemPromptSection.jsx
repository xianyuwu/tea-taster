import { useState, useEffect } from 'react';
import * as configApi from '../../api/config';

const DEFAULT_PROMPT = `你是一位资深的武夷岩茶品鉴专家，拥有 20 年以上的品茶经验。请从以下四个维度对用户提供的品茶记录进行专业分析：

## 一、品质评估
根据用户提供的评分和描述，对茶样的整体品质做出客观评价。重点关注香气、滋味、回甘、岩韵等核心指标，指出优点和不足。

## 二、工艺分析
基于茶样的特征（品种、等级、焙火程度等），推测其可能采用的制作工艺，分析工艺对品质的影响，并给出工艺改进建议。

## 三、性价比评估
结合茶样的价格和品质表现，评估其性价比。与同价位、同类型的武夷岩茶进行横向对比，判断是否物有所值。

## 四、品鉴建议
针对该茶样的特点，给出冲泡建议（水温、投茶量、冲泡时间等），以及存储建议。同时提供适合的品鉴场景和搭配推荐。`;

export default function SystemPromptSection({ config }) {
  const [prompt, setPrompt] = useState('');
  const [status, setStatus] = useState(null);

  useEffect(() => { setPrompt(config?.system_prompt || DEFAULT_PROMPT); }, [config]);

  const handleSave = async () => {
    setStatus(null);
    try {
      await configApi.saveConfig({ system_prompt: prompt });
      setStatus({ type: 'ok', msg: '系统提示词已保存' });
    } catch (e) {
      setStatus({ type: 'err', msg: e.message });
    }
  };

  return (
    <>
      {status && <div className={`status-msg ${status.type}`}>{status.msg}</div>}
      <div className="form-hint" style={{ marginBottom: 8 }}>定义 AI 品鉴分析的角色和行为，影响所有 AI 分析和对话的输出风格</div>
      <div className="form-group">
        <textarea className="form-input" value={prompt}
          onChange={e => setPrompt(e.target.value)} rows={12}
          style={{ resize: 'vertical', minHeight: 160, lineHeight: 1.6 }} />
      </div>
      <div className="btn-group">
        <button className="btn btn-primary" onClick={handleSave}>保存提示词</button>
        <button className="btn btn-secondary" onClick={() => setPrompt(DEFAULT_PROMPT)}>恢复默认</button>
      </div>
    </>
  );
}
