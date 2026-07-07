import { useEffect, useRef, useState, useCallback } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { WebLinksAddon } from "xterm-addon-web-links";
import { SearchAddon } from "xterm-addon-search";
import "xterm/css/xterm.css";
import "./Terminal.css";
import { AlertDialog, Button, Callout, Flex, IconButton, Select, TextField, Theme } from "@radix-ui/themes";
import { useTranslation } from "react-i18next";
import { Cross1Icon } from "@radix-ui/react-icons";
import { TablerAlertTriangleFilled } from "../../components/Icones/Tabler";
import CommandClipboardPanel from "@/pages/terminal/CommandClipboard";
import { Toaster } from "@/components/ui/sonner";
import { TerminalContext } from "@/contexts/TerminalContext";
import { motion } from "framer-motion";
import throttle from "lodash/throttle";
interface TerminalAreaProps {
  terminalRef: React.RefObject<HTMLDivElement | null>;
  toggleClipboard: () => void;
  width: number | string;
  isOpen: boolean;
}
const TerminalArea: React.FC<TerminalAreaProps> = ({
  terminalRef,
  toggleClipboard,
  width,
  isOpen,
}) => (
  <div
    className="relative flex justify-center bg-black md:bg-accent-3 flex-col h-full min-w-128"
    style={{ width }}
  >
    <div className="m-0 md:p-4 p-0 w-full h-full bg-black">
      <div ref={terminalRef} className="h-full w-full" />
    </div>
    <div
      className="absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center justify-center bg-accent-4 hover:bg-accent-6 text-white cursor-pointer rounded-l-full w-6 h-12 z-20"
      onClick={toggleClipboard}
    >
      {isOpen ? ">" : "<"}
    </div>
  </div>
);

const Divider: React.FC<{
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
}> = ({ onMouseDown }) => (
  <div
    className="h-full bg-accent-2 cursor-col-resize hover:bg-accent-4"
    style={{ width: 8 }}
    onMouseDown={onMouseDown}
    onTouchStart={onMouseDown}
  />
);

const ClipboardPanel: React.FC = () => (
  <div className="h-screen p-2 min-w-64" style={{ flex: 1 }}>
    <CommandClipboardPanel className="h-full w-full" />
  </div>
);

const SudoDurations: Record<string, string> = {
  "1h": "sudo_duration_1h",
  "24h": "sudo_duration_24h",
  "always": "sudo_duration_always",
};

interface SudoAuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified: () => void;
}

const SudoAuthDialog: React.FC<SudoAuthDialogProps> = ({
  open,
  onOpenChange,
  onVerified,
}) => {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [duration, setDuration] = useState("1h");
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async () => {
    if (code.length < 6) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/admin/sudo-auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ "2fa_code": code, duration }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            t("terminal.sudo_invalid_code", "Invalid or expired code")
        );
      }
      onOpenChange(false);
      onVerified();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : t("terminal.sudo_invalid_code", "Invalid or expired code")
      );
    } finally {
      setVerifying(false);
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Trigger>
        <button style={{ display: "none" }} />
      </AlertDialog.Trigger>
      <AlertDialog.Content maxWidth="450px">
        <AlertDialog.Title>
          {t("terminal.sudo_title", "需要 2FA 验证")}
        </AlertDialog.Title>
        <AlertDialog.Description size="2">
          {t(
            "terminal.sudo_description",
            "打开终端前需要验证您的二步验证身份。"
          )}
        </AlertDialog.Description>
        <Flex direction="column" gap="3" mt="3">
          <TextField.Root
            placeholder={t(
              "terminal.sudo_code_placeholder",
              "6 位验证码"
            )}
            maxLength={6}
            value={code}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setCode(e.target.value.replace(/\s/g, ""))
            }
          />
          <Select.Root value={duration} onValueChange={setDuration}>
            <Select.Trigger />
            <Select.Content>
              {Object.entries(SudoDurations).map(([value, labelKey]) => (
                <Select.Item key={value} value={value}>
                  {t(`terminal.${labelKey}`, value)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select.Root>
          {error && (
            <Callout.Root color="red" size="1">
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}
        </Flex>
        <Flex gap="3" mt="4" justify="end">
          <AlertDialog.Cancel>
            <Button variant="soft" color="gray">
              {t("cancel")}
            </Button>
          </AlertDialog.Cancel>
          <Button
            variant="solid"
            color="violet"
            onClick={handleVerify}
            loading={verifying}
          >
            {t("terminal.sudo_verify_button", "验证")}
          </Button>
        </Flex>
      </AlertDialog.Content>
    </AlertDialog.Root>
  );
};

const TerminalPage = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstance = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stopHeartbeatRef = useRef<(() => void) | null>(null);
  const params = new URLSearchParams(window.location.search);
  const uuid = params.get("uuid");
  const [callout, setCallout] = useState(false);
  const [showSudoDialog, setShowSudoDialog] = useState(false);
  const [sudoVerified, setSudoVerified] = useState(false);
  const [t] = useTranslation();
  const firstBinary = useRef(false);
  const onDataDisposeRef = useRef<(() => void) | null>(null);
  const [isClipboardOpen, setIsClipboardOpen] = useState(false);
  const [leftWidth, setLeftWidth] = useState<number>(window.innerWidth * 0.7);
  const draggingRef = useRef(false);
  const fitAddonRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 使用 useCallback 确保 resizeTerminal 引用稳定
  const resizeTerminal = useCallback(() => {
    fitAddonRef.current?.fit();
    const term = terminalInstance.current;
    const ws = wsRef.current;
    if (term && ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "resize",
          cols: term.cols,
          rows: term.rows,
        })
      );
    }
  }, []);

  const connectWs = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const baseUrl = `${protocol}//${host}`;

    // Close old connection if any
    stopHeartbeatRef.current?.();
    const oldWs = wsRef.current;
    if (oldWs) {
      if (oldWs.readyState === WebSocket.OPEN || oldWs.readyState === WebSocket.CONNECTING) {
        oldWs.close();
      }
    }

    const ws = new WebSocket(`${baseUrl}/api/admin/client/${uuid}/terminal`);
    ws.binaryType = "arraybuffer";
    wsRef.current = ws;

    const startHeartbeat = () => {
      heartbeatIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
        }
      }, 10000);
    };

    const stopHeartbeat = () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    };
    stopHeartbeatRef.current = stopHeartbeat;

    ws.onopen = () => {
      resizeTerminal();
      startHeartbeat();
    };

    ws.onmessage = (event) => {
      const term = terminalInstance.current;
      if (!term) return;
      if (event.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(event.data));
      } else {
        term.write(event.data);
      }
      if (!firstBinary.current && event.data instanceof ArrayBuffer) {
        firstBinary.current = true;
        setTimeout(() => {
          const t = terminalInstance.current;
          if (t) { t.resize(t.cols - 1, t.rows); }
          resizeTerminal();
        }, 200);
      }
    };

    ws.onclose = () => {
      stopHeartbeat();
      const term = terminalInstance.current;
      if (term) { term.write(`\n ${t("terminal.disconnect")}`); }
      setSudoVerified(false);
    };

    // Data from terminal → send to ws
    onDataDisposeRef.current?.();
    const onDataHandler = (data: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(new TextEncoder().encode(data));
      }
    };
    const onDataDispose = terminalInstance.current?.onData(onDataHandler);
    onDataDisposeRef.current = () => onDataDispose?.dispose();
  }, [t, uuid, resizeTerminal]);

  const startDragging = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      draggingRef.current = true;
      document.body.style.userSelect = "none";
    },
    []
  );

  const stopDragging = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      document.body.style.userSelect = "";
      resizeTerminal();
    }
  }, [resizeTerminal]);

  // 限制resize onMouseMove 调用频率
  const onMouseMove = useCallback(
    throttle((e: MouseEvent | TouchEvent) => {
      if (!draggingRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let clientX: number;

      if (e instanceof MouseEvent) {
        clientX = e.clientX;
      } else {
        clientX = e.touches[0].clientX;
      }

      const newLeftWidth = clientX - containerRect.left;
      const minWidth = 300;
      const maxWidth = containerRect.width - 300;

      if (newLeftWidth >= minWidth && newLeftWidth <= maxWidth) {
        setLeftWidth(newLeftWidth);
      }
    }, 1000 / 60), // （60fps）
    []
  );

  useEffect(() => {
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", stopDragging);
    document.addEventListener("touchmove", onMouseMove);
    document.addEventListener("touchend", stopDragging);

    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", stopDragging);
      document.removeEventListener("touchmove", onMouseMove);
      document.removeEventListener("touchend", stopDragging);
      onMouseMove.cancel(); // 清理 throttle
    };
  }, [onMouseMove, stopDragging]);

  useEffect(() => {
    if (uuid === null) {
      window.location.href = "/";
    }
    fetch("./api/admin/client/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.length === 0) {
          alert(t("terminal.no_active_connection"));
        }
        const client = data.find(
          (item: { uuid: string }) => item.uuid === uuid
        );
        document.title = `${t("terminal.title")} - ${
          client?.name || t("terminal.title")
        }`;
      });
  }, [t, uuid]);

  useEffect(() => {
    setCallout(window.location.protocol !== "https:");
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      macOptionIsMeta: true,
      scrollback: 5000,
      convertEol: true,
      fontFamily: "'Cascadia Mono', 'Noto Sans SC', monospace",
      fontSize: 16,
    });

    const fitAddon = new FitAddon();
    fitAddonRef.current = fitAddon;
    const webLinksAddon = new WebLinksAddon();
    const searchAddon = new SearchAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(searchAddon);

    term.open(terminalRef.current);
    terminalInstance.current = term;

    // Sudo preflight: check sudo token, then connect or show dialog
    fetch("/api/admin/sudo-check")
      .then((r) => {
        if (r.ok) {
          connectWs();
        } else {
          setShowSudoDialog(true);
        }
      })
      .catch(() => setShowSudoDialog(true));

    const handleResize = () => resizeTerminal();
    window.addEventListener("resize", handleResize);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === "f" || e.key === "d")) {
        searchAddon.findNext("");
        e.preventDefault();
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    const handleContextMenu = (e: MouseEvent) => {
      const ws = wsRef.current;
      if (!ws || e.ctrlKey || ws.readyState !== WebSocket.OPEN) return;
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) {
        e.preventDefault();
        navigator.clipboard.writeText(sel.toString()).finally(() => {
          term.focus();
          (sel as any).empty?.();
        });
      } else {
        e.preventDefault();
        term.focus();
        navigator.clipboard.readText().then((text) => {
          ws.send(new TextEncoder().encode(text.replace(/\r?\n/g, "\r")));
        });
      }
    };
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      stopHeartbeatRef.current?.();
      onDataDisposeRef.current?.();
      term.dispose();
      const ws = wsRef.current;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [t, uuid, resizeTerminal, connectWs]);

  // When sudo is verified (after 2FA auth), connect WebSocket
  useEffect(() => {
    if (sudoVerified && terminalInstance.current) {
      connectWs();
    }
  }, [sudoVerified, connectWs]);

  // 移除对 leftWidth 的直接依赖，改用防抖
  useEffect(() => {
    if (!fitAddonRef.current) return;
    const debouncedResize = setTimeout(() => {
      resizeTerminal();
    }, 100);
    return () => clearTimeout(debouncedResize);
  }, [isClipboardOpen, resizeTerminal]);

  const sendCommand = useCallback((cmd: string) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      const encoder = new TextEncoder();
      ws.send(encoder.encode(cmd + "\r"));
    }
  }, []);

  return (
    <TerminalContext.Provider
      value={{ terminal: terminalInstance.current, sendCommand }}
    >
      <Theme appearance="dark">
        <Toaster theme="dark" />
        <div className="absolute inset-x-0 top-4 flex justify-center items-center z-30">
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            hidden={!callout}
          >
            <Callout.Root
              color="red"
              size="2"
              className="bg-red-50 backdrop-blur-sm border-2 border-red-800 rounded-lg"
            >
              <Callout.Icon>
                <TablerAlertTriangleFilled className="text-red-700" />
              </Callout.Icon>
              <Callout.Text className="text-red-400 font-medium">
                <Flex align="center" justify="between" gap="3">
                  <span>{t("warn_https")}</span>
                  <IconButton
                    variant="soft"
                    color="red"
                    size="1"
                    className="hover:bg-red-200/50 transition-colors"
                    onClick={() => setCallout(false)}
                  >
                    <Cross1Icon />
                  </IconButton>
                </Flex>
              </Callout.Text>
            </Callout.Root>
          </motion.div>
        </div>
        <Flex className="h-screen w-screen" direction="row" ref={containerRef}>
          <TerminalArea
            terminalRef={terminalRef}
            toggleClipboard={() => setIsClipboardOpen(!isClipboardOpen)}
            width={isClipboardOpen ? `${leftWidth}px` : "100%"}
            isOpen={isClipboardOpen}
          />
          {isClipboardOpen && <Divider onMouseDown={startDragging} />}
          {isClipboardOpen && <ClipboardPanel />}
        </Flex>
      </Theme>
      <SudoAuthDialog
        open={showSudoDialog}
        onOpenChange={setShowSudoDialog}
        onVerified={() => setSudoVerified(true)}
      />
    </TerminalContext.Provider>
  );
};

export default TerminalPage;
