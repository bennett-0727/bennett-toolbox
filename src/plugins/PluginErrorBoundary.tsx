import * as React from "react";

interface Props {
  pluginId: string;
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

class PluginErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(previous: Props) {
    if (previous.pluginId !== this.props.pluginId && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="plugin-error">
          <strong>插件运行出错</strong>
          <span>{this.state.error.message}</span>
        </div>
      );
    }
    return this.props.children;
  }
}

export default PluginErrorBoundary;
