export default function MaterialIcon(props: { icon: string, size?: number, className?: string}) {
    return <span className={props.className} style={{
      lineHeight: 0,
      display: 'block',
    }}><span className="material-icons-outlined" style={{ fontSize: props.size, height: props.size, width: props.size, overflow: 'hidden' }}>{props.icon.replace(/-/g, '_')}</span></span>
  }
  
  MaterialIcon.PropsJSONSchema = {
    title: "MaterialIcon",
    description: "A icon from Material Icons",
    type: "object",
    properties: {
      icon: {
        title: "Icon",
        type: "string",
        default: "error",
      },
      className: {
        title: "ClassName",
        type: "string",
      },
      size: {
        title: "Size",
        type: "number",
        default: 24,
      },
    },
    required: ["text"],
  };