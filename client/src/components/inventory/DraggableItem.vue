<template>
  <div
    class="draggable-item"
    draggable
    @dragstart="onDragStart"
    @dragend="onDragEnd"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <Item
      :item="item"
      :label="label"
      :draggable="true"
      :on-drag-start="onDragStart"
      :width="width"
      :height="height"
    />
  </div>
</template>

<script setup>
import Item from "@/components/inventory/Item.vue";
import dragEventBus from "@/lib/dragEventBus";
const props = defineProps({
  item: { type: Object, required: true },
  label: { type: String, default: "" },
  source: { type: Object, default: () => ({}) },
  width: { type: [Number, String], default: undefined },
  height: { type: [Number, String], default: undefined },
});

function onDragStart(e) {
  try {
    const payload = { type: "item", item: props.item, source: props.source };
    const dt = e.dataTransfer;
    dt.setData("application/json", JSON.stringify(payload));
    dt.effectAllowed = "move";
    // announce global drag start so slots can highlight
    try {
      dragEventBus.emit("drag-start", {
        item: props.item,
        source: props.source,
      });
    } catch (_) {
      /* ignore drag event bus errors */
    }
    // create a custom drag image (small canvas) for better visuals
    try {
      const size = 48;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      // draw background / border
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.fillRect(0, 0, size, size);
      // if there's an image, draw it scaled into the canvas
      if (props.item && props.item.img) {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          // clear and draw with slight padding
          ctx.clearRect(0, 0, size, size);
          const pad = 4;
          ctx.drawImage(img, pad, pad, size - pad * 2, size - pad * 2);
          try {
            dt.setDragImage(canvas, size / 2, size / 2);
          } catch (_) {
            /* ignore */
          }
        };
        img.onerror = () => {
          // fallback to text if image can't load
          ctx.clearRect(0, 0, size, size);
          ctx.fillStyle = "#444";
          ctx.fillRect(0, 0, size, size);
          ctx.fillStyle = "#fff";
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(
            props.label || props.item.name || "?",
            size / 2,
            size / 2
          );
          try {
            dt.setDragImage(canvas, size / 2, size / 2);
          } catch (_) {
            /* ignore */
          }
        };
        img.src = props.item.img;
      } else {
        // draw text fallback immediately
        ctx.fillStyle = "#444";
        ctx.fillRect(0, 0, size, size);
        ctx.fillStyle = "#fff";
        ctx.font = "10px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          props.label || (props.item && props.item.name) || "?",
          size / 2,
          size / 2
        );
        try {
          dt.setDragImage(canvas, size / 2, size / 2);
        } catch (_) {
          /* ignore */
        }
      }
    } catch (imgErr) {
      // ignore drag image errors
      console.warn("drag image creation failed", imgErr);
    }
  } catch (err) {
    console.warn("dragstart failed", err);
  }
}

function onDragEnd() {
  // announce global drag end so slots can clear highlight
  try {
    dragEventBus.emit("drag-end", {});
  } catch (_) {
    /* ignore drag event bus errors */
  }
}

function onMouseEnter() {
  try {
    // determine a container id associated with this item where possible
    const cid =
      (props.source && props.source.containerId) ||
      (props.item &&
        (props.item.containerId ||
          (props.item.container && props.item.container.id))) ||
      null;
    dragEventBus.emit("container-hover", {
      containerId: cid,
      item: props.item,
    });
  } catch (e) {
    /* ignore */
  }
}

function onMouseLeave() {
  try {
    dragEventBus.emit("container-leave", {});
  } catch (e) {
    /* ignore */
  }
}
</script>

<style scoped>
.draggable-item {
  width: 100%;
  height: 100%;
}
</style>
