<template>
  <div class="containers">
    <div ref="content" class="content with-diagram">
      <div class="canvas" ref="canvas"></div>
      <div id="js-properties-panel" class="panel"></div>
    </div>

    <ul class="buttons">
      <li>
        <a href="javascript:" @click="$refs.refFile.click()"
          >加载本地BPMN文件</a
        >
        <input
          type="file"
          id="files"
          ref="refFile"
          style="display: none"
          @change="loadXML"
        />
      </li>
      <li>
        <a href="javascript:" @click="saveXML" title="保存为bpmn"
          >保存为BPMN文件</a
        >
      </li>
      <li>
        <a href="javascript:" @click="saveSVG" title="保存为svg"
          >保存为SVG图片</a
        >
      </li>
      <li>
        <a href="javascript:" @click="handlerUndo" title="撤销操作">撤销</a>
      </li>
      <li>
        <a href="javascript:" @click="handlerRedo" title="恢复操作">恢复</a>
      </li>
      <li>
        <a href="javascript:" @click="handlerZoom(0.1)" title="放大">放大</a>
      </li>
      <li>
        <a href="javascript:" @click="handlerZoom(-0.1)" title="缩小">缩小</a>
      </li>
      <li>
        <a href="javascript:" @click="handlerZoom(0)" title="还原">还原</a>
      </li>
    </ul>
  </div>
</template>

<script>
import BpmnModeler from "bpmn-js/lib/Modeler";
import { xmlStr } from "../mock/xmlStr";
import is from "bpmn-js/lib/util/ModelUtil";
import "bpmn-js-properties-panel/dist/assets/properties-panel.css"; // 右边工具栏样式
// 这里引入的是右侧属性栏这个框
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
  // use Camunda Platform properties provider
  CamundaPlatformPropertiesProviderModule
} from "bpmn-js-properties-panel";
// 一个描述的json
import camundaModdleDescriptor from "camunda-bpmn-moddle/resources/camunda";
import camundaPlatformBehaviors from "camunda-bpmn-js-behaviors/lib/camunda-platform";

// BPMN国际化
import customTranslate from "./resource/customTranslate";
// 自定义汉化模块
var customTranslateModule = {
  translate: ["value", customTranslate]
};

export default {
  name: "ops-coffee",
  mounted() {
    this.init();
  },
  data() {
    return {
      bpmnModeler: null,
      container: null,
      canvas: null,
      xmlStr: xmlStr
    };
  },
  methods: {
    init() {
      const canvas = this.$refs.canvas;
      this.bpmnModeler = new BpmnModeler({
        container: canvas,
        //添加控制板
        propertiesPanel: {
          parent: "#js-properties-panel"
        },
        additionalModules: [
          BpmnPropertiesPanelModule,
          BpmnPropertiesProviderModule,
          CamundaPlatformPropertiesProviderModule,
          camundaPlatformBehaviors,
          // 国际化
          customTranslateModule
        ],
        moddleExtensions: {
          //如果要在属性面板中维护camunda：XXX属性，则需要此
          camunda: camundaModdleDescriptor
        }
      });

      this.createNewDiagram();
    },
    async createNewDiagram() {
      try {
        const result = await this.bpmnModeler.importXML(this.xmlStr);
        const { warnings } = result;
        console.log(warnings);

        this.success();
      } catch (err) {
        console.log(err.message, err.warnings);
      }
    },
    success() {
      this.addModelerListener();
      this.addEventBusListener();
    },
    async loadXML() {
      const that = this;
      const file = this.$refs.refFile.files[0];

      var reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function() {
        that.xmlStr = this.result;
        that.createNewDiagram();
      };
    },
    async saveXML() {
      try {
        const result = await this.bpmnModeler.saveXML({ format: true });
        const { xml } = result;

        var xmlBlob = new Blob([xml], {
          type: "application/bpmn20-xml;charset=UTF-8,"
        });

        var downloadLink = document.createElement("a");
        downloadLink.download = "ops-coffee-bpmn.bpmn";
        downloadLink.innerHTML = "Get BPMN SVG";
        downloadLink.href = window.URL.createObjectURL(xmlBlob);
        downloadLink.onclick = function(event) {
          document.body.removeChild(event.target);
        };
        downloadLink.style.visibility = "hidden";
        document.body.appendChild(downloadLink);
        downloadLink.click();
      } catch (err) {
        console.log(err);
      }
    },
    async saveSVG() {
      try {
        const result = await this.bpmnModeler.saveSVG();
        const { svg } = result;

        var svgBlob = new Blob([svg], {
          type: "image/svg+xml"
        });

        var downloadLink = document.createElement("a");
        downloadLink.download = "ops-coffee-bpmn.svg";
        downloadLink.innerHTML = "Get BPMN SVG";
        downloadLink.href = window.URL.createObjectURL(svgBlob);
        downloadLink.onclick = function(event) {
          document.body.removeChild(event.target);
        };
        downloadLink.style.visibility = "hidden";
        document.body.appendChild(downloadLink);
        downloadLink.click();
      } catch (err) {
        console.log(err);
      }
    },
    handlerRedo() {
      this.bpmnModeler.get("commandStack").redo();
    },
    handlerUndo() {
      this.bpmnModeler.get("commandStack").undo();
    },
    handlerZoom(radio) {
      const newScale = !radio ? 1.0 : this.scale + radio;
      this.bpmnModeler.get("canvas").zoom(newScale);

      this.scale = newScale;
    },
    addModelerListener() {
      const that = this;

      that.bpmnModeler.on("element.click", e => {
        console.log("modelerListener", e);
      });
    },
    addEventBusListener() {
      const that = this;
      const eventBus = this.bpmnModeler.get("eventBus");

      eventBus.on("element.click", function(e) {
        that.elementClick(e);
      });
    },
    elementClick(e) {
      const that = this;
      const modeling = this.bpmnModeler.get("modeling");

      if (e.element.businessObject.$type === "bpmn:StartEvent") {
        console.log(
          "这是一个开始节点",
          e.element.businessObject.id,
          e.element.businessObject.$type,
          e.element.businessObject.name
        );

        // 修改节点ID
        modeling.updateProperties(e.element, {
          id: "StartEvent_ops_coffee"
        });
      }

      if (e.element.businessObject.$type === "bpmn:UserTask") {
        console.log(
          "这是一个用户节点",
          e.element.businessObject.id,
          e.element.businessObject.$type,
          e.element.businessObject.name
        );

        // 修改节点名称
        modeling.updateProperties(e.element, {
          name: "ops-coffee.cn"
        });
      }
    }
  }
};
</script>

<style scoped>
.content {
  position: relative;
  width: 100%;
  height: 100%;
}
.containers {
  width: 100%;
  height: calc(100vh - 60px);
}
.canvas {
  width: 100%;
  height: 100%;
}
.buttons {
  position: absolute;
  left: 20px;
  bottom: 20px;
}
.buttons li {
  display: inline-block;
  margin: 5px;
}
.buttons li a {
  color: #333;
  background: #fff;
  cursor: pointer;
  padding: 8px;
  border: 1px solid #ccc;
  text-decoration: none;
}
/* line 119, styles/app.less */
.panel {
  position: absolute;
  top: 0;
  bottom: 0;
  right: 0;
  width: 260px;
  z-index: 10;
  border-left: 1px solid #ccc;
  overflow: auto;
}

/* line 128, styles/app.less */
.panel:empty {
  display: none;
}

/* line 131, styles/app.less */
.panel > .djs-properties-panel {
  padding-bottom: 70px;
  min-height: 100%;
}
</style>
