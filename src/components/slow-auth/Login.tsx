import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ConnectKitButton,
  ConnectKitProvider,
  SIWEProvider,
  useSIWE,
} from "connectkit";
import { useAtom } from "jotai";
import { useEffect } from "react";
import { useAccount, WagmiProvider } from "wagmi";
import { authAtom } from "./client";
import { connectKitTheme, siweConfig, wagmiConfig } from "./config";
import { AddressAvatar } from "./AddressAvatar";
import { Button } from "./Button";

function Login({ defaultPath }: { defaultPath?: string }) {
  const navigate = useNavigate();
  const [auth] = useAtom(authAtom);
  const { address, isConnected } = useAccount();
  const { isSignedIn, signIn } = useSIWE();
  const { search } = useRouterState().location;
  const redirectUrl = search?.redirect
    ? decodeURIComponent(search.redirect)
    : null;

  // Check for existing session when wallet is connected and signed in
  useEffect(() => {
    if (auth.isAuthenticated) {
      // Navigate to redirect URL or default to /program
      if (redirectUrl && !redirectUrl.startsWith("/login")) {
        // Just navigate to the pathname and let search params reset
        const url = new URL(redirectUrl, window.location.origin);
        navigate({ to: url.pathname as any });
      } else {
        navigate({ to: defaultPath ?? "/" });
      }
    }
  }, [auth]);

  return (
    <div className="px-4">
      <div>Think Slow & Solve Hard Problems</div>
      <div>
        <h2 className="mt-6 font-bold text-gray-900">Sign in</h2>
        <p className="mt-2 text-sm text-gray-600">
          Connect your wallet to continue
        </p>
      </div>
      <div className="space-x-2">
        <ConnectKitButton.Custom>
          {(props) => {
            return (
              <Button
                onClick={() => {
                  props.show?.();
                }}
              >
                {props.isConnected ? props.address : "Connect Wallet"}
              </Button>
            );
          }}
        </ConnectKitButton.Custom>
        {isConnected && !isSignedIn && (
          <Button onClick={() => signIn()}>SignIn</Button>
        )}
      </div>
    </div>
  );
}

export default function LoginWithProvider({
  defaultPath,
}: {
  defaultPath?: string;
}) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <SIWEProvider {...siweConfig}>
        <ConnectKitProvider
          options={{
            hideBalance: true,
            enforceSupportedChains: false,
            hideTooltips: true,
            customAvatar: AddressAvatar,
          }}
          customTheme={connectKitTheme}
        >
          <Login defaultPath={defaultPath} />
        </ConnectKitProvider>
      </SIWEProvider>
    </WagmiProvider>
  );
}
