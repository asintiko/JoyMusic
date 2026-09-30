import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "@joymusic/ui";
import { Empty } from "./empty";

interface Props {
  children: ReactNode;
  title: string;
  description: string;
  retryLabel: string;
  resetKey?: string;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
  key: string | undefined;
}

export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, key: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.key) return { error: null, key: props.resetKey };
    return null;
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    console.error(error);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto max-w-[520px] py-16">
        <Empty
          illustration="error"
          title={this.props.title}
          description={this.props.description}
          action={
            <Button variant="secondary" onClick={() => this.setState({ error: null })}>
              {this.props.retryLabel}
            </Button>
          }
        />
      </div>
    );
  }
}
