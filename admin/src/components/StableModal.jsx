import React from "react";
import {
	Box,
	ModalInline,
	Overlay,
} from "@adminjs/design-system";

/**
 * Drop-in replacement for `@adminjs/design-system` `Modal`.
 *
 * The bundled Modal portals via `PortalUtils.createPortalForKey`, whose inner `useEffect`
 * omits a dependency array. That effect removes and re-appends the portal container on
 * every re-render, which destroys focused inputs after each keystroke.
 *
 * This version renders the same overlay + ModalInline layout inline (still fixed /
 * viewport-centered), without that portal lifecycle bug.
 */
export default function StableModal(
	props,
) {
	const {
		onOverlayClick,
		onClose,
		...modalProps
	} =
		props;
	const handleOverlayClick =
		onOverlayClick ??
		onClose ??
		(() => {});

	return (
		<Box
			position="fixed"
			top={
				0
			}
			left={
				0
			}
			right={
				0
			}
			bottom={
				0
			}
			display="flex"
			justifyContent="center"
			alignItems="center"
			style={{
				zIndex: 10050,
			}}
		>
			{/*
			  Overlay uses z-index 999; ModalStyled has none, so without this layering the dimmed
			  layer sits above the dialog and every click fires onOverlayClick (closes modal).
			  Mirrors ModalWrapper’s "& > ModalStyled { z-index: 1001 }".
			*/}
			<Overlay
				onClick={
					handleOverlayClick
				}
			/>
			<Box
				position="relative"
				style={{
					zIndex: 1001,
				}}
				onClick={(
					e,
				) =>
					e.stopPropagation()
				}
			>
				<ModalInline
					onClose={
						onClose
					}
					{...modalProps}
				/>
			</Box>
		</Box>
	);
}
