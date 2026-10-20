window.SentinelHierarchy = [
        { id:'project-demo', name:'Demo 项目', plants:[
          { id:'plant-water', name:'送水泵房', units:[
            { id:'unit-water-main', name:'送水机组', pumps:[{ id:'pump-omega-1', name:'1# Omega 泵' },{ id:'pump-omega-2', name:'2# Omega 泵' }] },
            { id:'unit-water-aux', name:'辅助机组', pumps:[{ id:'pump-aux', name:'辅助泵' }] }
          ]},
          { id:'plant-circulation', name:'循环水泵房', units:[
            { id:'unit-circulation', name:'循环水机组', pumps:[{ id:'pump-circulation-1', name:'1# 循环泵' },{ id:'pump-circulation-2', name:'2# 循环泵' }] }
          ]}
        ]},
        { id:'project-east', name:'华东示范项目', plants:[
          { id:'plant-pressure', name:'增压泵房', units:[
            { id:'unit-pressure', name:'增压机组', pumps:[{ id:'pump-pressure-1', name:'1# 增压泵' },{ id:'pump-pressure-2', name:'2# 增压泵' }] }
          ]}
        ]}
      ];
