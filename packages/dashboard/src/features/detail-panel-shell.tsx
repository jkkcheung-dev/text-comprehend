type DetailPanelShellProps = {
  children: string;
};

export function DetailPanelShell({ children }: DetailPanelShellProps) {
  return (
    <aside>
      <h2>Detail panel</h2>
      <p>{children}</p>
    </aside>
  );
}
