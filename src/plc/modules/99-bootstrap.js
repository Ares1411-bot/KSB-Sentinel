// 99-bootstrap.js — compiled in declaration order by build-prototypes.cjs
      $$('[data-close-modal]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));
      $$('.modal-layer').forEach(layer => layer.addEventListener('mousedown', event => { if (event.target === layer) closeModal(layer.id); }));
      document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        const openLayer = $$('.modal-layer.open').at(-1); if (openLayer) return closeModal(openLayer.id);
        if ($('#managementView').classList.contains('open')) { $('#managementView').classList.remove('open'); return; }
        if (plcButton.getAttribute('aria-expanded') === 'true') setPanelOpen(false, true);
      });


const savePLCSession=()=>{
 pumpStates[currentPumpId]={devices,cardConfig};
 window.SentinelSession.set('plc.configuration',{standardFields,templates,thresholdRules,pumpThresholdRules,pumpStates});
 window.SentinelSession.set('context',{projectId:currentProjectId,plantId:currentPlantId,unitId:currentUnitId,pumpId:currentPumpId});
};
window.addEventListener('pagehide',savePLCSession);
      window.sentinelPrototype = {
        context:currentContext, hierarchy:()=>hierarchy, pumpId:()=>currentPumpId, devices:()=>devices,
        fields:()=>standardFields, rules:()=>thresholdRules, history:thresholdAlertHistory,
        findSource, matchedLevel, severityNames, severityColors, effectiveThresholdRule,
        trendSource:()=>selectedTrendSource, bounds:selectedTrendBounds, series:trendSeries,
        openTrend:source=>{selectedTrendSource=source;setPanelOpen(true);renderPanel();renderTrendPanel();},
        setRange:(start,end)=>{$('#trendStartTime').value=start;$('#trendEndTime').value=end;trendRange='custom';},
        saveSession:savePLCSession, refresh:renderPanel, toast
      };
      renderContextSelectors(); renderPumpTree(); renderPanel(); renderDeviceTable(); renderTemplateTable(); renderFieldTable(); renderWarningRules();
    
