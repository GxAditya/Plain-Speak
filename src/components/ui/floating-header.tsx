import React from 'react';
import { FileText, MenuIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetFooter } from './sheet';
import { Button, buttonVariants } from './button';
import { cn } from '../../lib/utils';

export interface FloatingHeaderProps {
	onGetStarted?: () => void;
	onLogin?: () => void;
}

export function FloatingHeader({ onGetStarted, onLogin }: FloatingHeaderProps) {
	const [open, setOpen] = React.useState(false);

	const links = [
		{
			label: 'Features',
			href: '#features',
		},
		{
			label: 'Pricing',
			href: '#pricing',
		},
	];

	const handleGetStarted = () => {
		setOpen(false);
		onGetStarted?.();
	};

	const handleLogin = () => {
		setOpen(false);
		onLogin?.();
	};

	return (
		<header
			className={cn(
				'sticky top-5 z-50',
				'mx-auto w-full max-w-3xl rounded-lg border border-bolt-gray-200 shadow',
				'bg-white/95 supports-[backdrop-filter]:bg-white/80 backdrop-blur-lg',
			)}
		>
			<nav className="mx-auto flex items-center justify-between p-1.5">
				<div className="hover:bg-bolt-gray-100 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 duration-100">
					<div className="w-7 h-7 bg-bolt-gray-900 rounded-md flex items-center justify-center">
						<FileText className="h-3.5 w-3.5 text-white" />
					</div>
					<p className="text-base font-semibold text-bolt-gray-900">PlainSpeak</p>
				</div>
				<div className="hidden items-center gap-1 lg:flex">
					{links.map((link) => (
						<a
							key={link.label}
							className={buttonVariants({ variant: 'ghost', size: 'sm' })}
							href={link.href}
						>
							{link.label}
						</a>
					))}
				</div>
				<div className="flex items-center gap-2">
					<Button size="sm" onClick={handleGetStarted}>Get Started</Button>
					<Sheet open={open} onOpenChange={setOpen}>
						<Button
							size="icon"
							variant="outline"
							onClick={() => setOpen(!open)}
							className="lg:hidden"
						>
							<MenuIcon className="size-4" />
						</Button>
						<SheetContent
							className="bg-white/95 supports-[backdrop-filter]:bg-white/80 gap-0 backdrop-blur-lg"
							showClose={false}
							side="left"
						>
							<div className="grid gap-y-2 overflow-y-auto px-4 pt-12 pb-5">
								{links.map((link) => (
									<a
										key={link.label}
										className={buttonVariants({
											variant: 'ghost',
											className: 'justify-start',
										})}
										href={link.href}
										onClick={() => setOpen(false)}
									>
										{link.label}
									</a>
								))}
							</div>
							<SheetFooter>
								<Button variant="outline" onClick={handleLogin}>Sign In</Button>
								<Button onClick={handleGetStarted}>Get Started</Button>
							</SheetFooter>
						</SheetContent>
					</Sheet>
				</div>
			</nav>
		</header>
	);
}
