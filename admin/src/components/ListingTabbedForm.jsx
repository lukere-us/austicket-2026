import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import ReactQuill from "react-quill";
import {
	ApiClient,
	BasePropertyComponent,
	isEntireRecordGiven,
	updateRecord,
	useNotice,
} from "adminjs";
import {
	Box,
	Button,
	DatePicker,
	H2,
	Icon,
	Input,
	Label,
	Select,
	Text,
	TextArea,
} from "@adminjs/design-system";
import StableModal from "./StableModal.jsx";

function makeClientKey() {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function makeEmptyShow() {
	return {
		__key:
			makeClientKey(),
		place_id:
			"",
		start_date:
			"",
		end_date:
			"",
		publish_at:
			"",
		unpublish_at:
			"",
		booking_url:
			"",
		ticket_cost:
			"",
		times:
			[
				{
					show_time:
						"",
					notes:
						"",
				},
			],
	};
}

function buildRecordState(
	initial,
) {
	if (
		!initial
	) {
		return {
			params:
				{},
			errors:
				{},
			populated:
				{},
		};
	}
	const params =
		initial.params &&
		typeof initial.params ===
			"object" &&
		!Array.isArray(
			initial.params,
		)
			? {
					...initial.params,
				}
			: {};
	return {
		id: initial.id,
		params,
		errors:
			initial.errors &&
			typeof initial.errors ===
				"object" &&
			!Array.isArray(
				initial.errors,
			)
				? {
						...initial.errors,
					}
				: {},
		populated:
			initial.populated &&
			typeof initial.populated ===
				"object" &&
			!Array.isArray(
				initial.populated,
			)
				? {
						...initial.populated,
					}
				: {},
	};
}

function normalizeShowPayload(
	raw,
) {
	const shows =
		Array.isArray(
			raw?.shows,
		)
			? raw.shows
			: [];
	const toSortKey =
		(
			s,
		) => {
			const start =
				String(
					s?.start_date ||
						"",
				).trim();
			const publish =
				String(
					s?.publish_at ||
						"",
				).trim();
			// Prefer start_date; fallback to publish_at; empty sorts last.
			return (
				start ||
				publish ||
				""
			);
		};

	return {
		shows:
			shows
				.map(
					(
						s,
					) => ({
						__key:
							s?.__key ??
							makeClientKey(),
						place_id:
							s?.place_id ??
							"",
						start_date:
							s?.start_date ??
							"",
						end_date:
							s?.end_date ??
							"",
						publish_at:
							s?.publish_at ??
							"",
						unpublish_at:
							s?.unpublish_at ??
							"",
						booking_url:
							s?.booking_url ??
							"",
						ticket_cost:
							s?.ticket_cost ??
							"",
						times:
							Array.isArray(
								s?.times,
							)
								? s.times.map(
										(
											t,
										) => ({
											show_time:
												t?.show_time ??
												"",
											notes:
												t?.notes ??
												"",
										}),
									)
								: [
										{
											show_time:
												"",
											notes:
												"",
										},
									],
					}),
				)
				.sort(
					(
						a,
						b,
					) => {
						const ak =
							toSortKey(
								a,
							);
						const bk =
							toSortKey(
								b,
							);
						if (
							!ak &&
							!bk
						)
							return 0;
						if (
							!ak
						)
							return 1;
						if (
							!bk
						)
							return -1;
						// Descending: newer/larger strings first (works for YYYY-MM-DD and YYYY-MM-DD HH:mm:ss)
						return bk.localeCompare(
							ak,
						);
					},
				),
	};
}

function isSqlDateTime(
	s,
) {
	return (
		typeof s ===
			"string" &&
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(
			s.trim(),
		)
	);
}

/** AdminJS / MySQL often return ISO (`YYYY-MM-DDTHH:mm:ss.sssZ`) or fractional seconds — normalize for validation + save. */
function normalizeListingDatetime(
	value,
) {
	const raw =
		String(
			value ??
				"",
		).trim();
	if (
		!raw
	)
		return "";

	if (
		/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(
			raw,
		)
	)
		return raw;

	let m =
		raw.match(
			/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2}:\d{2})\.\d+/,
		);
	if (
		m
	)
		return `${m[1]} ${m[2]}`;

	m =
		raw.match(
			/^(\d{4}-\d{2}-\d{2})[\sT](\d{2}:\d{2}:\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/i,
		);
	if (
		m
	)
		return `${m[1]} ${m[2]}`;

	if (
		/^\d{4}-\d{2}-\d{2}$/.test(
			raw,
		)
	)
		return `${raw} 00:00:00`;

	return "";
}

/** `YYYY-MM-DD` slice from DATE/DATETIME/ISO — avoids `${iso}T00…` / `.000Z` duplication breaking react-datepicker. */
function extractShowCalendarYmd(
	value,
) {
	const raw =
		String(
			value ??
				"",
		).trim();
	if (
		!raw
	)
		return "";
	const norm =
		normalizeListingDatetime(
			raw,
		);
	const cand =
		(
			norm
				? norm.slice(
						0,
						10,
					)
				: raw.slice(
						0,
						10,
					)
		).trim();
	return /^\d{4}-\d{2}-\d{2}$/.test(
		cand,
	)
		? cand
		: "";
}

function showDateToPickerIso(
	value,
) {
	const ymd =
		extractShowCalendarYmd(
			value,
		);
	return ymd
		? `${ymd}T00:00:00.000Z`
		: "";
}

function parseShowBoundaryDate(
	value,
) {
	const iso =
		showDateToPickerIso(
			value,
		);
	return iso
		? new Date(
				iso,
			)
		: undefined;
}

function normalizeShowsPayloadForSave(
	showsPayload,
) {
	const shows =
		Array.isArray(
			showsPayload?.shows,
		)
			? showsPayload.shows
			: [];
	return {
		shows:
			shows.map(
				(
					s,
				) => ({
					...s,
					start_date:
						extractShowCalendarYmd(
							s.start_date,
						) ||
						"",
					end_date:
						extractShowCalendarYmd(
							s.end_date,
						) ||
						"",
					publish_at:
						normalizeListingDatetime(
							s.publish_at,
						) ||
						"",
					unpublish_at:
						normalizeListingDatetime(
							s.unpublish_at,
						) ||
						"",
					times:
						Array.isArray(
							s.times,
						)
							? s.times.map(
									(
										t,
									) => ({
										...t,
										show_time:
											normalizeListingDatetime(
												t.show_time,
											) ||
											"",
									}),
								)
							: [],
				}),
			),
	};
}

function validateShowsPayload(
	showsPayload,
) {
	const errs =
		[];
	const shows =
		Array.isArray(
			showsPayload?.shows,
		)
			? showsPayload.shows
			: [];
	for (
		let i = 0;
		i <
		shows.length;
		i += 1
	) {
		const s =
			shows[
				i
			] ||
			{};
		const label = `Show #${i + 1}`;

		const startYmd =
			extractShowCalendarYmd(
				s.start_date,
			);
		const endYmd =
			extractShowCalendarYmd(
				s.end_date,
			);
		if (
			startYmd &&
			endYmd &&
			endYmd <
				startYmd
		) {
			errs.push(
				`${label}: Start date must be <= End date.`,
			);
		}

		const pubRaw =
			String(
				s.publish_at ||
					"",
			).trim();
		const unpubRaw =
			String(
				s.unpublish_at ||
					"",
			).trim();
		const pubNorm =
			normalizeListingDatetime(
				s.publish_at,
			);
		const unpubNorm =
			normalizeListingDatetime(
				s.unpublish_at,
			);

		if (
			pubRaw &&
			!pubNorm
		) {
			errs.push(
				`${label}: Publish at is invalid.`,
			);
		}
		if (
			unpubRaw &&
			!unpubNorm
		) {
			errs.push(
				`${label}: Unpublish at is invalid.`,
			);
		}
		if (
			pubNorm &&
			unpubNorm &&
			unpubNorm <
				pubNorm
		) {
			errs.push(
				`${label}: Unpublish at must be >= Publish at.`,
			);
		}

		const times =
			Array.isArray(
				s.times,
			)
				? s.times
				: [];
		for (
			let j = 0;
			j <
			times.length;
			j += 1
		) {
			const t =
				times[
					j
				] ||
				{};
			const stRaw =
				String(
					t.show_time ||
						"",
				).trim();
			if (
				!stRaw
			)
				continue;
			const stNorm =
				normalizeListingDatetime(
					t.show_time,
				);
			if (
				!stNorm
			) {
				errs.push(
					`${label}: Time #${j + 1} is invalid.`,
				);
			}
		}
	}
	return errs;
}

function slugify(
	input,
) {
	return String(
		input ||
			"",
	)
		.trim()
		.toLowerCase()
		.normalize(
			"NFKD",
		)
		.replace(
			/[\u0300-\u036f]/g,
			"",
		)
		.replace(
			/[^a-z0-9]+/g,
			"-",
		)
		.replace(
			/^-+|-+$/g,
			"",
		)
		.slice(
			0,
			220,
		);
}

/** AdminJS `@adminjs/sql` often omits auto-increment id on `create()` responses — resolve via list fallback. */
function extractAdminRecordId(
	rec,
) {
	if (
		!rec ||
		typeof rec !==
			"object"
	)
		return "";
	const raw =
		rec.id ??
		rec
			.params
			?.id;
	if (
		raw !=
			null &&
		raw !==
			""
	)
		return String(
			raw,
		);
	return "";
}

async function resolveCastIdAfterCreate(
	api,
	name,
	position,
	rec,
) {
	const direct =
		extractAdminRecordId(
			rec,
		);
	if (
		direct
	)
		return direct;
	const listRes =
		await api.resourceAction(
			{
				resourceId:
					"casts",
				actionName:
					"list",
				params:
					{
						perPage: 40,
						sortBy:
							"id",
						direction:
							"desc",
					},
			},
		);
	const records =
		Array.isArray(
			listRes
				?.data
				?.records,
		)
			? listRes
					.data
					.records
			: [];
	const n =
		String(
			name ||
				"",
		).trim();
	const p =
		String(
			position ||
				"",
		).trim();
	const match =
		records.find(
			(
				r,
			) =>
				String(
					r
						?.params
						?.name ??
						"",
				).trim() ===
					n &&
				String(
					r
						?.params
						?.position ??
						"",
				).trim() ===
					p,
		);
	const mid =
		extractAdminRecordId(
			match ||
				records[0],
		);
	return (
		mid ||
		""
	);
}

function emptyCastDraft() {
	return {
		name: "",
		position:
			"",
		description:
			"",
		facebook_url:
			"",
		tiktok_url:
			"",
		instagram_url:
			"",
		wikipedia_url:
			"",
	};
}

function normalizeNameKey(
	value,
) {
	return String(
		value ??
			"",
	)
		.replace(
			/\s+/g,
			" ",
		)
		.trim()
		.toLowerCase();
}

/**
 * Own React subtree so typing does not re-render the heavy ListingTabbedForm / AdminJS shell
 * (which was stealing focus after each keystroke).
 */
function ListingAddCastModal(
	props,
) {
	const {
		isOpen,
		onClose,
		api,
		sendNotice,
		sendNoticeRef,
		onCastCreated,
	} =
		props;
	const [
		draft,
		setDraft,
	] =
		useState(
			emptyCastDraft,
		);
	const [
		saving,
		setSaving,
	] =
		useState(
			false,
		);
	const [
		duplicateFromApi,
		setDuplicateFromApi,
	] =
		useState(
			false,
		);
	const [
		checkingDuplicate,
		setCheckingDuplicate,
	] =
		useState(
			false,
		);
	const duplicateCheckSeqRef =
		useRef(
			0,
		);

	const existingCastNameKeys =
		Array.isArray(
			props?.existingCastNameKeys,
		)
			? props.existingCastNameKeys
			: [];
	const duplicateLocalMatch =
		useMemo(() => {
			const key =
				normalizeNameKey(
					draft?.name,
				);
			if (
				!key
			)
				return false;
			return existingCastNameKeys.includes(
				key,
			);
		}, [
			draft?.name,
			existingCastNameKeys,
		]);

	const nameTrimmed =
		String(
			draft?.name ??
				"",
		).trim();
	const nameKeyLive =
		normalizeNameKey(
			nameTrimmed,
		);

	useEffect(() => {
		if (
			isOpen
		) {
			setDraft(
				emptyCastDraft(),
			);
			setSaving(
				false,
			);
			setDuplicateFromApi(
				false,
			);
			setCheckingDuplicate(
				false,
			);
		}
	}, [
		isOpen,
	]);

	/** Debounced `casts` list with `filters.name` — shows up in Network and matches DB (not only the loaded dropdown cache). */
	useEffect(() => {
		if (
			!isOpen
		) {
			return;
		}
		if (
			!nameKeyLive
		) {
			duplicateCheckSeqRef.current += 1;
			setDuplicateFromApi(
				false,
			);
			setCheckingDuplicate(
				false,
			);
			return;
		}
		const requestSeq =
			++duplicateCheckSeqRef.current;
		const t =
			setTimeout(
				async () => {
					setCheckingDuplicate(
						true,
					);
					try {
						const res =
							await api.resourceAction(
								{
									resourceId:
										"casts",
									actionName:
										"list",
									params:
										{
											perPage: 50,
											sortBy:
												"name",
											direction:
												"asc",
											"filters.name":
												nameTrimmed,
										},
								},
							);
						if (
							requestSeq !==
							duplicateCheckSeqRef.current
						) {
							return;
						}
						const records =
							Array.isArray(
								res
									?.data
									?.records,
							)
								? res
										.data
										.records
								: [];
						const found =
							records.some(
								(
									r,
								) =>
									normalizeNameKey(
										r
											?.params
											?.name,
									) ===
									nameKeyLive,
							);
						setDuplicateFromApi(
							found,
						);
					} catch {
						if (
							requestSeq ===
							duplicateCheckSeqRef.current
						)
							setDuplicateFromApi(
								false,
							);
					} finally {
						if (
							requestSeq ===
							duplicateCheckSeqRef.current
						)
							setCheckingDuplicate(
								false,
							);
					}
				},
				300,
			);
		return () => {
			clearTimeout(
				t,
			);
			duplicateCheckSeqRef.current += 1;
		};
	}, [
		isOpen,
		nameTrimmed,
		nameKeyLive,
		api,
	]);

	const duplicateNameMatch =
		duplicateLocalMatch ||
		duplicateFromApi;

	const save =
		async () => {
			const name =
				String(
					draft.name ||
						"",
				).trim();
			const position =
				String(
					draft.position ||
						"",
				).trim();
			if (
				!name ||
				!position
			) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							"Cast name and position are required.",
					},
				);
				return;
			}
			setSaving(
				true,
			);
			try {
				const res =
					await api.resourceAction(
						{
							resourceId:
								"casts",
							actionName:
								"new",
							data: {
								name,
								position,
								description:
									String(
										draft.description ||
											"",
									).trim(),
								facebook_url:
									String(
										draft.facebook_url ||
											"",
									).trim(),
								tiktok_url:
									String(
										draft.tiktok_url ||
											"",
									).trim(),
								instagram_url:
									String(
										draft.instagram_url ||
											"",
									).trim(),
								wikipedia_url:
									String(
										draft.wikipedia_url ||
											"",
									).trim(),
							},
						},
					);
				const notice =
					res
						?.data
						?.notice;
				if (
					notice?.type ===
					"error"
				) {
					sendNotice(
						notice,
					);
					return;
				}
				const rec =
					res
						?.data
						?.record;
				const errObj =
					rec?.errors &&
					typeof rec.errors ===
						"object" &&
					!Array.isArray(
						rec.errors,
					)
						? rec.errors
						: null;
				if (
					errObj &&
					Object.keys(
						errObj,
					)
						.length >
						0
				) {
					let msg =
						"Could not save cast.";
					for (const k of Object.keys(
						errObj,
					)) {
						const v =
							errObj[
								k
							];
						if (
							typeof v ===
							"string"
						) {
							msg =
								v;
							break;
						}
						if (
							v &&
							typeof v ===
								"object" &&
							typeof v.message ===
								"string"
						) {
							msg =
								v.message;
							break;
						}
					}
					sendNoticeRef.current(
						{
							type: "error",
							message:
								msg,
						},
					);
					return;
				}
				const newId =
					await resolveCastIdAfterCreate(
						api,
						name,
						position,
						rec,
					);
				if (
					!newId
				) {
					sendNoticeRef.current(
						{
							type: "error",
							message:
								"Cast saved but the server did not return an id. Refresh the page and select the cast from the list.",
						},
					);
					return;
				}
				const label = `${name} — ${position}`;
				onCastCreated(
					{
						id: newId,
						label,
					},
				);
				sendNoticeRef.current(
					{
						type: "success",
						message:
							"Cast saved.",
					},
				);
				onClose();
			} catch (e) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							e?.message ||
							String(
								e,
							),
					},
				);
			} finally {
				setSaving(
					false,
				);
			}
		};

	if (
		!isOpen
	)
		return null;

	return (
		<StableModal
			title="Add new cast"
			onClose={
				onClose
			}
			onOverlayClick={
				onClose
			}
		>
			<Box mt="md">
				<Label>
					Name
				</Label>
				<Input
					value={
						draft.name
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								name: e
									.target
									.value,
							}),
						)
					}
					disabled={
						saving
					}
				/>
				{duplicateNameMatch ? (
					<Text
						variant="sm"
						color="warning"
						mt="sm"
					>
						This
						cast
						name
						already
						exists.
						Please
						double-check
						before
						saving.
					</Text>
				) : checkingDuplicate &&
				  nameKeyLive ? (
					<Text
						variant="sm"
						color="grey60"
						mt="sm"
					>
						Checking
						duplicates…
					</Text>
				) : null}
			</Box>
			<Box mt="lg">
				<Label>
					Position
				</Label>
				<Input
					value={
						draft.position
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								position:
									e
										.target
										.value,
							}),
						)
					}
					disabled={
						saving
					}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					Description
					(optional)
				</Label>
				<TextArea
					value={
						draft.description
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								description:
									e
										.target
										.value,
							}),
						)
					}
					rows={
						4
					}
					disabled={
						saving
					}
					style={{
						width:
							"100%",
					}}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					Facebook
					URL
					(optional)
				</Label>
				<Input
					value={
						draft.facebook_url
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								facebook_url:
									e
										.target
										.value,
							}),
						)
					}
					disabled={
						saving
					}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					Instagram
					URL
					(optional)
				</Label>
				<Input
					value={
						draft.instagram_url
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								instagram_url:
									e
										.target
										.value,
							}),
						)
					}
					disabled={
						saving
					}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					TikTok
					URL
					(optional)
				</Label>
				<Input
					value={
						draft.tiktok_url
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								tiktok_url:
									e
										.target
										.value,
							}),
						)
					}
					disabled={
						saving
					}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					Wikipedia
					URL
					(optional)
				</Label>
				<Input
					value={
						draft.wikipedia_url
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								wikipedia_url:
									e
										.target
										.value,
							}),
						)
					}
					disabled={
						saving
					}
				/>
			</Box>
			<Box
				mt="xl"
				display="flex"
				justifyContent="flex-end"
				style={{
					gap: 12,
				}}
			>
				<Button
					type="button"
					variant="text"
					onClick={
						onClose
					}
					disabled={
						saving
					}
				>
					Cancel
				</Button>
				<Button
					type="button"
					variant="primary"
					onClick={
						save
					}
					disabled={
						saving
					}
				>
					{saving
						? "Saving…"
						: "Save"}
				</Button>
			</Box>
		</StableModal>
	);
}

function ListingAddPlaceModal(
	props,
) {
	const {
		isOpen,
		onClose,
		api,
		cityOptions,
		isCitiesLoading,
		draft,
		setDraft,
		isSavingPlace,
		onSave,
	} =
		props;
	const [
		duplicateFromApi,
		setDuplicateFromApi,
	] =
		useState(
			false,
		);
	const [
		checkingDuplicate,
		setCheckingDuplicate,
	] =
		useState(
			false,
		);
	const duplicateCheckSeqRef =
		useRef(
			0,
		);

	const nameTrimmed =
		String(
			draft?.name ??
				"",
		).trim();
	const cityIdStr =
		String(
			draft?.city_id ??
				"",
		).trim();
	const nameKeyLive =
		normalizeNameKey(
			nameTrimmed,
		);
	const pairReady =
		Boolean(
			nameKeyLive &&
			cityIdStr,
		);

	useEffect(() => {
		if (
			!isOpen
		) {
			return;
		}
		duplicateCheckSeqRef.current += 1;
		setDuplicateFromApi(
			false,
		);
		setCheckingDuplicate(
			false,
		);
	}, [
		isOpen,
	]);

	useEffect(() => {
		if (
			!isOpen
		) {
			return;
		}
		if (
			!pairReady
		) {
			duplicateCheckSeqRef.current += 1;
			setDuplicateFromApi(
				false,
			);
			setCheckingDuplicate(
				false,
			);
			return;
		}
		const requestSeq =
			++duplicateCheckSeqRef.current;
		const t =
			setTimeout(
				async () => {
					setCheckingDuplicate(
						true,
					);
					try {
						const res =
							await api.resourceAction(
								{
									resourceId:
										"places",
									actionName:
										"list",
									params:
										{
											perPage: 50,
											sortBy:
												"name",
											direction:
												"asc",
											"filters.name":
												nameTrimmed,
											"filters.city_id":
												cityIdStr,
										},
								},
							);
						if (
							requestSeq !==
							duplicateCheckSeqRef.current
						) {
							return;
						}
						const records =
							Array.isArray(
								res
									?.data
									?.records,
							)
								? res
										.data
										.records
								: [];
						const found =
							records.some(
								(
									r,
								) =>
									String(
										r
											?.params
											?.city_id ??
											"",
									).trim() ===
										cityIdStr &&
									normalizeNameKey(
										r
											?.params
											?.name,
									) ===
										nameKeyLive,
							);
						setDuplicateFromApi(
							found,
						);
					} catch {
						if (
							requestSeq ===
							duplicateCheckSeqRef.current
						)
							setDuplicateFromApi(
								false,
							);
					} finally {
						if (
							requestSeq ===
							duplicateCheckSeqRef.current
						)
							setCheckingDuplicate(
								false,
							);
					}
				},
				300,
			);
		return () => {
			clearTimeout(
				t,
			);
			duplicateCheckSeqRef.current += 1;
		};
	}, [
		isOpen,
		nameTrimmed,
		cityIdStr,
		nameKeyLive,
		pairReady,
		api,
	]);

	if (
		!isOpen
	)
		return null;

	return (
		<StableModal
			title="Add new place"
			onClose={
				onClose
			}
			onOverlayClick={
				onClose
			}
		>
			<Box mt="md">
				<Label>
					Name
				</Label>
				<Input
					value={
						draft.name
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								name: e
									.target
									.value,
							}),
						)
					}
					disabled={
						isSavingPlace
					}
				/>
				{duplicateFromApi ? (
					<Text
						variant="sm"
						color="warning"
						mt="sm"
					>
						A
						place
						with
						this
						name
						already
						exists
						in
						the
						selected
						city.
						Please
						double-check
						before
						saving.
					</Text>
				) : checkingDuplicate &&
				  pairReady ? (
					<Text
						variant="sm"
						color="grey60"
						mt="sm"
					>
						Checking
						duplicates…
					</Text>
				) : nameKeyLive &&
				  !cityIdStr ? (
					<Text
						variant="sm"
						color="grey60"
						mt="sm"
					>
						Select
						a
						city
						to
						check
						for
						duplicate
						place
						names.
					</Text>
				) : null}
			</Box>
			<Box mt="lg">
				<Label>
					City
				</Label>
				<Select
					isLoading={
						isCitiesLoading
					}
					options={
						cityOptions
					}
					placeholder="Select a city…"
					value={
						cityOptions.find(
							(
								o,
							) =>
								String(
									o.value,
								) ===
								String(
									draft.city_id,
								),
						) ||
						null
					}
					onChange={(
						opt,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								city_id:
									opt?.value ||
									"",
							}),
						)
					}
					isDisabled={
						isSavingPlace
					}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					Address
					(optional)
				</Label>
				<Input
					value={
						draft.address
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								address:
									e
										.target
										.value,
							}),
						)
					}
					disabled={
						isSavingPlace
					}
				/>
			</Box>
			<Box mt="lg">
				<Label>
					Google
					Maps
					link
					(optional)
				</Label>
				<Input
					value={
						draft.google_map_link
					}
					onChange={(
						e,
					) =>
						setDraft(
							(
								prev,
							) => ({
								...prev,
								google_map_link:
									e
										.target
										.value,
							}),
						)
					}
					placeholder="https://maps.google.com/?q=..."
					disabled={
						isSavingPlace
					}
				/>
			</Box>
			<Box
				mt="xl"
				display="flex"
				justifyContent="flex-end"
				style={{
					gap: 12,
				}}
			>
				<Button
					type="button"
					variant="text"
					onClick={
						onClose
					}
					disabled={
						isSavingPlace
					}
				>
					Cancel
				</Button>
				<Button
					type="button"
					variant="primary"
					onClick={
						onSave
					}
					disabled={
						isSavingPlace
					}
				>
					{isSavingPlace
						? "Saving…"
						: "Save"}
				</Button>
			</Box>
		</StableModal>
	);
}

function ensureQuillStylesheet() {
	if (
		typeof document ===
		"undefined"
	)
		return;
	const id =
		"quill-snow-css";
	if (
		document.getElementById(
			id,
		)
	)
		return;
	const link =
		document.createElement(
			"link",
		);
	link.id =
		id;
	link.rel =
		"stylesheet";
	link.href =
		"https://cdn.jsdelivr.net/npm/quill@1.3.7/dist/quill.snow.css";
	document.head.appendChild(
		link,
	);
}

export default function ListingTabbedForm(
	props,
) {
	const {
		action,
		record:
			initialRecord,
		resource,
	} = props;
	const sendNotice =
		useNotice();
	const sendNoticeRef =
		useRef(
			sendNotice,
		);
	sendNoticeRef.current =
		sendNotice;
	const api =
		useMemo(
			() =>
				new ApiClient(),
			[],
		);
	const [
		placeOptions,
		setPlaceOptions,
	] =
		useState(
			[],
		);
	const [
		placeMetaById,
		setPlaceMetaById,
	] =
		useState(
			{},
		); // { [placeId]: { google_map_link?: string|null } }
	const [
		isPlacesLoading,
		setIsPlacesLoading,
	] =
		useState(
			false,
		);
	const [
		castOptions,
		setCastOptions,
	] =
		useState(
			[],
		);
	const [
		castNameKeys,
		setCastNameKeys,
	] =
		useState(
			[],
		);
	const [
		isCastsLoading,
		setIsCastsLoading,
	] =
		useState(
			false,
		);
	const [
		cityOptions,
		setCityOptions,
	] =
		useState(
			[],
		);
	const [
		isCitiesLoading,
		setIsCitiesLoading,
	] =
		useState(
			false,
		);
	const [
		placeModalOpen,
		setPlaceModalOpen,
	] =
		useState(
			false,
		);
	const [
		placeModalShowIdx,
		setPlaceModalShowIdx,
	] =
		useState(
			null,
		);
	const [
		newPlaceDraft,
		setNewPlaceDraft,
	] =
		useState(
			{
				name: "",
				city_id:
					"",
				address:
					"",
				google_map_link:
					"",
			},
		);
	const [
		isSavingPlace,
		setIsSavingPlace,
	] =
		useState(
			false,
		);
	const [
		castModalOpen,
		setCastModalOpen,
	] =
		useState(
			false,
		);
	const [
		selectedCastIds,
		setSelectedCastIds,
	] =
		useState(
			[],
		);
	const [
		galleryImages,
		setGalleryImages,
	] =
		useState(
			[],
		); // { image_path, sort_order, publicUrl? }
	const [
		isUploading,
		setIsUploading,
	] =
		useState(
			false,
		);
	const [
		bannerUploading,
		setBannerUploading,
	] =
		useState(
			false,
		);
	const [
		slugTouched,
		setSlugTouched,
	] =
		useState(
			false,
		);

	const [
		record,
		setRecord,
	] =
		useState(
			() =>
				buildRecordState(
					initialRecord,
				),
		);
	const [
		activeTab,
		setActiveTab,
	] =
		useState(
			"listing",
		);
	const [
		showsPayload,
		setShowsPayload,
	] =
		useState(
			{
				shows:
					[],
			},
		);
	const [
		openShowKey,
		setOpenShowKey,
	] =
		useState(
			null,
		);
	const [
		isSaving,
		setIsSaving,
	] =
		useState(
			false,
		);

	const isEdit =
		action?.name ===
		"edit";
	/** Prefer server record id on edit; avoids feedback loops with local `record` updates. */
	const listingId =
		isEdit
			? (initialRecord?.id ??
				record?.id)
			: null;

	const handlePropertyChange =
		useCallback(
			(
				propertyOrRecord,
				value,
				selectedRecord,
			) => {
				if (
					isEntireRecordGiven(
						propertyOrRecord,
						value,
					)
				) {
					setRecord(
						buildRecordState(
							propertyOrRecord,
						),
					);
				} else if (
					typeof propertyOrRecord ===
					"string"
				) {
					setRecord(
						(
							prev,
						) =>
							updateRecord(
								propertyOrRecord,
								value,
								selectedRecord,
							)(
								prev,
							),
					);
				}
			},
			[],
		);

	// Only re-hydrate when the opened record actually changes (not on every parent re-render).
	const recordSyncKey = `${action?.name ?? ""}:${initialRecord?.id != null ? String(initialRecord.id) : "new"}`;
	useEffect(() => {
		setRecord(
			buildRecordState(
				initialRecord,
			),
		);
		setSlugTouched(
			false,
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps -- `initialRecord` is a new object every render; `recordSyncKey` is the stable identity
	}, [
		recordSyncKey,
	]);

	const handleListingFieldChange =
		useCallback(
			(
				propertyOrRecord,
				value,
				selectedRecord,
			) => {
				if (
					typeof propertyOrRecord ===
					"string"
				) {
					if (
						propertyOrRecord ===
						"slug"
					) {
						setSlugTouched(
							true,
						);
					}
					if (
						propertyOrRecord ===
							"title" &&
						!slugTouched
					) {
						const nextSlug =
							slugify(
								value,
							);
						setRecord(
							(
								prev,
							) =>
								updateRecord(
									"slug",
									nextSlug,
								)(
									updateRecord(
										"title",
										value,
										selectedRecord,
									)(
										prev,
									),
								),
						);
						return;
					}
				}
				handlePropertyChange(
					propertyOrRecord,
					value,
					selectedRecord,
				);
			},
			[
				handlePropertyChange,
				slugTouched,
			],
		);

	const listingProperties =
		useMemo(() => {
			let all =
				resource?.editProperties;
			if (
				!Array.isArray(
					all,
				)
			) {
				all =
					all &&
					typeof all ===
						"object"
						? Object.values(
								all,
							)
						: [];
			}
			// Banner + trailer go to Media tab
			return all.filter(
				(
					p,
				) =>
					p &&
					p.propertyPath !==
						"shows_payload" &&
					p.propertyPath !==
						"banner_image" &&
					p.propertyPath !==
						"trailer_url" &&
					p.propertyPath !==
						"description_html" &&
					p.propertyPath !==
						"created_at" &&
					p.propertyPath !==
						"updated_at" &&
					p.propertyPath !==
						"created_by_admin_id" &&
					p.propertyPath !==
						"updated_by_admin_id",
			);
		}, [
			resource,
		]);

	useEffect(() => {
		ensureQuillStylesheet();
	}, []);

	useEffect(() => {
		let cancelled = false;
		const run =
			async () => {
				setIsPlacesLoading(
					true,
				);
				try {
					const res =
						await api.resourceAction(
							{
								resourceId:
									"places",
								actionName:
									"list",
								params:
									{
										perPage: 5000,
										sortBy:
											"name",
										direction:
											"asc",
									},
							},
						);
					const records =
						Array.isArray(
							res
								?.data
								?.records,
						)
							? res
									.data
									.records
							: [];
					const opts =
						records.map(
							(
								r,
							) => ({
								value:
									String(
										r.id,
									),
								label:
									r
										?.params
										?.name
										? String(
												r
													.params
													.name,
											)
										: `Place #${r.id}`,
							}),
						);
					const meta =
						{};
					for (const r of records) {
						const id =
							r?.id !=
							null
								? String(
										r.id,
									)
								: null;
						if (
							!id
						)
							continue;
						meta[
							id
						] =
							{
								google_map_link:
									r
										?.params
										?.google_map_link
										? String(
												r
													.params
													.google_map_link,
											)
										: null,
							};
					}
					if (
						!cancelled
					) {
						setPlaceOptions(
							opts,
						);
						setPlaceMetaById(
							meta,
						);
					}
				} catch (e) {
					if (
						!cancelled
					) {
						sendNoticeRef.current(
							{
								type: "error",
								message: `Failed to load places: ${e?.message || e}`,
							},
						);
					}
				} finally {
					if (
						!cancelled
					)
						setIsPlacesLoading(
							false,
						);
				}
			};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		api,
	]);

	// Load existing gallery images on edit
	useEffect(() => {
		if (
			!isEdit ||
			listingId ==
				null
		)
			return;
		let cancelled = false;
		const run =
			async () => {
				try {
					const res =
						await api.resourceAction(
							{
								resourceId:
									"listing_gallery_images",
								actionName:
									"list",
								params:
									{
										"filters.listing_id":
											listingId,
										perPage: 200,
										sortBy:
											"sort_order",
										direction:
											"asc",
									},
							},
						);
					const records =
						Array.isArray(
							res
								?.data
								?.records,
						)
							? res
									.data
									.records
							: [];
					const imgs =
						records.map(
							(
								r,
								idx,
							) => {
								const p =
									r
										?.params
										?.image_path
										? String(
												r
													.params
													.image_path,
											)
										: "";
								const fileName =
									p
										.split(
											"/",
										)
										.pop() ||
									"";
								const publicUrl =
									fileName
										? `/admin/uploads-root/${encodeURIComponent(fileName)}`
										: undefined;
								return {
									image_path:
										p,
									sort_order:
										Number(
											r
												?.params
												?.sort_order ??
												idx,
										) ||
										idx,
									publicUrl,
								};
							},
						);
					if (
						!cancelled
					)
						setGalleryImages(
							imgs,
						);
				} catch (e) {
					if (
						!cancelled
					) {
						sendNoticeRef.current(
							{
								type: "error",
								message: `Failed to load gallery: ${e?.message || e}`,
							},
						);
					}
				}
			};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		isEdit,
		listingId,
		api,
	]);

	// Load casts options
	useEffect(() => {
		let cancelled = false;
		const run =
			async () => {
				setIsCastsLoading(
					true,
				);
				try {
					const res =
						await api.resourceAction(
							{
								resourceId:
									"casts",
								actionName:
									"list",
								params:
									{
										perPage: 500,
										sortBy:
											"name",
										direction:
											"asc",
									},
							},
						);
					const records =
						Array.isArray(
							res
								?.data
								?.records,
						)
							? res
									.data
									.records
							: [];
					const opts =
						records.map(
							(
								r,
							) => ({
								value:
									String(
										r.id,
									),
								label: `${r?.params?.name ? String(r.params.name) : `Cast #${r.id}`}${
									r
										?.params
										?.position
										? ` — ${String(r.params.position)}`
										: ""
								}`,
							}),
						);
					const nameKeys =
						records
							.map(
								(
									r,
								) =>
									normalizeNameKey(
										r
											?.params
											?.name,
									),
							)
							.filter(
								Boolean,
							);
					if (
						!cancelled
					)
						setCastOptions(
							opts,
						);
					if (
						!cancelled
					)
						setCastNameKeys(
							nameKeys,
						);
				} catch (e) {
					if (
						!cancelled
					) {
						sendNoticeRef.current(
							{
								type: "error",
								message: `Failed to load cast: ${e?.message || e}`,
							},
						);
					}
				} finally {
					if (
						!cancelled
					)
						setIsCastsLoading(
							false,
						);
				}
			};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		api,
	]);

	useEffect(() => {
		let cancelled = false;
		const run =
			async () => {
				setIsCitiesLoading(
					true,
				);
				try {
					const res =
						await api.resourceAction(
							{
								resourceId:
									"cities",
								actionName:
									"list",
								params:
									{
										perPage: 500,
										sortBy:
											"name",
										direction:
											"asc",
									},
							},
						);
					const records =
						Array.isArray(
							res
								?.data
								?.records,
						)
							? res
									.data
									.records
							: [];
					const opts =
						records.map(
							(
								r,
							) => ({
								value:
									String(
										r.id,
									),
								label:
									r
										?.params
										?.name
										? `${String(
												r
													.params
													.name,
											)} (#${r.id})`
										: `City #${r.id}`,
							}),
						);
					if (
						!cancelled
					)
						setCityOptions(
							opts,
						);
				} catch (e) {
					if (
						!cancelled
					) {
						sendNoticeRef.current(
							{
								type: "error",
								message: `Failed to load cities: ${e?.message || e}`,
							},
						);
					}
				} finally {
					if (
						!cancelled
					)
						setIsCitiesLoading(
							false,
						);
				}
			};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		api,
	]);

	// Load existing listing_casts on edit
	useEffect(() => {
		if (
			!isEdit ||
			listingId ==
				null
		)
			return;
		let cancelled = false;
		const run =
			async () => {
				try {
					const res =
						await api.resourceAction(
							{
								resourceId:
									"listing_casts",
								actionName:
									"list",
								params:
									{
										"filters.listing_id":
											listingId,
										perPage: 500,
										sortBy:
											"sort_order",
										direction:
											"asc",
									},
							},
						);
					const records =
						Array.isArray(
							res
								?.data
								?.records,
						)
							? res
									.data
									.records
							: [];
					const ids =
						records
							.map(
								(
									r,
								) =>
									String(
										r
											?.params
											?.cast_id ||
											"",
									),
							)
							.filter(
								Boolean,
							);
					if (
						!cancelled
					)
						setSelectedCastIds(
							ids,
						);
				} catch (e) {
					if (
						!cancelled
					) {
						sendNoticeRef.current(
							{
								type: "error",
								message: `Failed to load cast links: ${e?.message || e}`,
							},
						);
					}
				}
			};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		isEdit,
		listingId,
		api,
	]);

	const uploadImages =
		async (
			files,
		) => {
			const list =
				Array.from(
					files ||
						[],
				);
			if (
				list.length ===
				0
			)
				return [];
			if (
				list.length >
				10
			) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							"Maximum 10 images allowed",
					},
				);
				return [];
			}
			for (const f of list) {
				if (
					f.size >
					4 *
						1024 *
						1024
				) {
					sendNoticeRef.current(
						{
							type: "error",
							message:
								"Each file must be <= 4MB",
						},
					);
					return [];
				}
			}

			const form =
				new FormData();
			list.forEach(
				(
					f,
				) =>
					form.append(
						"files",
						f,
					),
			);
			const res =
				await fetch(
					"/admin/api/uploads/listing-media",
					{
						method:
							"POST",
						body: form,
					},
				);
			const data =
				await res
					.json()
					.catch(
						() => ({}),
					);
			if (
				!res.ok
			)
				throw new Error(
					data?.error ||
						"Upload failed",
				);
			return Array.isArray(
				data?.files,
			)
				? data.files
				: [];
		};

	const onAddGalleryFiles =
		async (
			e,
		) => {
			try {
				const files =
					e
						?.target
						?.files;
				if (
					!files
				)
					return;
				const remaining =
					10 -
					(galleryImages?.length ||
						0);
				if (
					remaining <=
					0
				) {
					sendNoticeRef.current(
						{
							type: "error",
							message:
								"Maximum 10 images already added",
						},
					);
					return;
				}
				const subset =
					Array.from(
						files,
					).slice(
						0,
						remaining,
					);
				setIsUploading(
					true,
				);
				const uploaded =
					await uploadImages(
						subset,
					);
				const newOnes =
					uploaded.map(
						(
							u,
							idx,
						) => ({
							image_path:
								u.storedPath,
							sort_order:
								(galleryImages?.length ||
									0) +
								idx,
							publicUrl:
								u.publicUrl,
						}),
					);
				setGalleryImages(
					(
						prev,
					) =>
						[
							...(prev ||
								[]),
							...newOnes,
						].slice(
							0,
							10,
						),
				);
			} catch (err) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							err?.message ||
							String(
								err,
							),
					},
				);
			} finally {
				setIsUploading(
					false,
				);
				if (
					e?.target
				)
					e.target.value =
						"";
			}
		};

	const onUploadBanner =
		async (
			e,
		) => {
			try {
				const file =
					e
						?.target
						?.files?.[0];
				if (
					!file
				)
					return;
				if (
					file.size >
					4 *
						1024 *
						1024
				) {
					sendNoticeRef.current(
						{
							type: "error",
							message:
								"Banner image must be <= 4MB",
						},
					);
					return;
				}
				setBannerUploading(
					true,
				);
				const uploaded =
					await uploadImages(
						[
							file,
						],
					);
				const first =
					uploaded?.[0];
				if (
					!first?.storedPath
				)
					return;
				handlePropertyChange(
					"banner_image",
					first.storedPath,
				);
			} catch (err) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							err?.message ||
							String(
								err,
							),
					},
				);
			} finally {
				setBannerUploading(
					false,
				);
				if (
					e?.target
				)
					e.target.value =
						"";
			}
		};

	useEffect(() => {
		if (
			!isEdit ||
			listingId ==
				null
		) {
			return;
		}
		let cancelled = false;
		const run =
			async () => {
				try {
					const showList =
						await api.resourceAction(
							{
								resourceId:
									"shows",
								actionName:
									"list",
								params:
									{
										"filters.listing_id":
											listingId,
										perPage: 200,
									},
							},
						);
					const showRecords =
						Array.isArray(
							showList
								?.data
								?.records,
						)
							? showList
									.data
									.records
							: [];

					const shows =
						[];
					for (const s of showRecords) {
						if (
							cancelled
						)
							return;
						const showId =
							s?.id;
						const timesList =
							await api.resourceAction(
								{
									resourceId:
										"show_times",
									actionName:
										"list",
									params:
										{
											"filters.show_id":
												showId,
											perPage: 500,
											sortBy:
												"show_time",
											direction:
												"asc",
										},
								},
							);
						const timeRecords =
							Array.isArray(
								timesList
									?.data
									?.records,
							)
								? timesList
										.data
										.records
								: [];
						shows.push(
							{
								__key:
									makeClientKey(),
								place_id:
									s
										?.params
										?.place_id ??
									"",
								start_date:
									s
										?.params
										?.start_date ??
									"",
								end_date:
									s
										?.params
										?.end_date ??
									"",
								publish_at:
									s
										?.params
										?.publish_at ??
									"",
								unpublish_at:
									s
										?.params
										?.unpublish_at ??
									"",
								booking_url:
									s
										?.params
										?.booking_url ??
									"",
								ticket_cost:
									s
										?.params
										?.ticket_cost ??
									"",
								times:
									timeRecords.length >
									0
										? timeRecords.map(
												(
													t,
												) => ({
													show_time:
														t
															?.params
															?.show_time ??
														"",
													notes:
														t
															?.params
															?.notes ??
														"",
												}),
											)
										: [
												{
													show_time:
														"",
													notes:
														"",
												},
											],
							},
						);
					}

					if (
						!cancelled
					) {
						setShowsPayload(
							normalizeShowPayload(
								{
									shows,
								},
							),
						);
						setOpenShowKey(
							shows[0]
								?.__key ||
								null,
						);
					}
				} catch (e) {
					if (
						!cancelled
					) {
						sendNoticeRef.current(
							{
								type: "error",
								message: `Failed to load shows: ${e?.message || e}`,
							},
						);
					}
				}
			};
		void run();
		return () => {
			cancelled = true;
		};
	}, [
		isEdit,
		listingId,
		api,
	]);

	const addShow =
		() => {
			const next =
				makeEmptyShow();
			setShowsPayload(
				(
					prev,
				) => ({
					shows:
						[
							next,
							...(prev?.shows ||
								[]),
						],
				}),
			);
			setOpenShowKey(
				next.__key,
			);
		};

	const removeShow =
		(
			idx,
		) => {
			setShowsPayload(
				(
					prev,
				) => {
					const shows =
						prev?.shows ||
						[];
					const removed =
						shows[
							idx
						];
					const nextShows =
						shows.filter(
							(
								_,
								i,
							) =>
								i !==
								idx,
						);
					if (
						removed?.__key &&
						removed.__key ===
							openShowKey
					) {
						setOpenShowKey(
							nextShows[0]
								?.__key ||
								null,
						);
					}
					return {
						shows:
							nextShows,
					};
				},
			);
		};

	const updateShow =
		(
			idx,
			key,
			value,
		) => {
			setShowsPayload(
				(
					prev,
				) => ({
					shows:
						(
							prev?.shows ||
							[]
						).map(
							(
								s,
								i,
							) =>
								i ===
								idx
									? {
											...s,
											[key]:
												value,
										}
									: s,
						),
				}),
			);
		};

	const closeAddPlaceModal =
		() => {
			setPlaceModalOpen(
				false,
			);
			setPlaceModalShowIdx(
				null,
			);
			setNewPlaceDraft(
				{
					name: "",
					city_id:
						"",
					address:
						"",
					google_map_link:
						"",
				},
			);
		};

	const openAddPlaceModal =
		(
			showIdx,
		) => {
			setPlaceModalShowIdx(
				showIdx,
			);
			setNewPlaceDraft(
				{
					name: "",
					city_id:
						"",
					address:
						"",
					google_map_link:
						"",
				},
			);
			setPlaceModalOpen(
				true,
			);
		};

	const saveNewPlace =
		async () => {
			const name =
				String(
					newPlaceDraft.name ||
						"",
				).trim();
			const cityId =
				String(
					newPlaceDraft.city_id ||
						"",
				).trim();
			if (
				!name ||
				!cityId
			) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							"Place name and city are required.",
					},
				);
				return;
			}
			setIsSavingPlace(
				true,
			);
			try {
				const res =
					await api.resourceAction(
						{
							resourceId:
								"places",
							actionName:
								"new",
							data: {
								name,
								city_id:
									cityId,
								address:
									String(
										newPlaceDraft.address ||
											"",
									).trim(),
								google_map_link:
									String(
										newPlaceDraft.google_map_link ||
											"",
									).trim(),
							},
						},
					);
				const notice =
					res
						?.data
						?.notice;
				if (
					notice?.type ===
					"error"
				) {
					sendNotice(
						notice,
					);
					return;
				}
				const rec =
					res
						?.data
						?.record;
				const errObj =
					rec?.errors &&
					typeof rec.errors ===
						"object" &&
					!Array.isArray(
						rec.errors,
					)
						? rec.errors
						: null;
				if (
					errObj &&
					Object.keys(
						errObj,
					)
						.length >
						0
				) {
					let msg =
						"Could not save place.";
					for (const k of Object.keys(
						errObj,
					)) {
						const v =
							errObj[
								k
							];
						if (
							typeof v ===
							"string"
						) {
							msg =
								v;
							break;
						}
						if (
							v &&
							typeof v ===
								"object" &&
							typeof v.message ===
								"string"
						) {
							msg =
								v.message;
							break;
						}
					}
					sendNoticeRef.current(
						{
							type: "error",
							message:
								msg,
						},
					);
					return;
				}
				const newIdRaw =
					rec?.id ??
					rec
						?.params
						?.id;
				const newId =
					newIdRaw !=
					null
						? String(
								newIdRaw,
							)
						: "";
				if (
					!newId
				) {
					sendNoticeRef.current(
						{
							type: "error",
							message:
								"Place saved but response had no id.",
						},
					);
					return;
				}
				const mapLink =
					rec
						?.params
						?.google_map_link
						? String(
								rec
									.params
									.google_map_link,
							)
						: String(
								newPlaceDraft.google_map_link ||
									"",
							).trim() ||
							null;
				setPlaceOptions(
					(
						prev,
					) => {
						const rest =
							prev.filter(
								(
									o,
								) =>
									String(
										o.value,
									) !==
									newId,
							);
						const next =
							[
								...rest,
								{
									value:
										newId,
									label:
										name,
								},
							];
						next.sort(
							(
								a,
								b,
							) =>
								String(
									a.label,
								).localeCompare(
									String(
										b.label,
									),
								),
						);
						return next;
					},
				);
				setPlaceMetaById(
					(
						prev,
					) => ({
						...prev,
						[newId]:
							{
								google_map_link:
									mapLink,
							},
					}),
				);
				if (
					placeModalShowIdx !=
					null
				) {
					updateShow(
						placeModalShowIdx,
						"place_id",
						newId,
					);
				}
				sendNoticeRef.current(
					{
						type: "success",
						message:
							"Place saved.",
					},
				);
				closeAddPlaceModal();
			} catch (e) {
				sendNoticeRef.current(
					{
						type: "error",
						message:
							e?.message ||
							String(
								e,
							),
					},
				);
			} finally {
				setIsSavingPlace(
					false,
				);
			}
		};

	const handleCastCreated =
		useCallback(
			({
				id,
				label,
			}) => {
				const newId =
					String(
						id,
					);
				setCastOptions(
					(
						prev,
					) => {
						const rest =
							prev.filter(
								(
									o,
								) =>
									String(
										o.value,
									) !==
									newId,
							);
						const next =
							[
								...rest,
								{
									value:
										newId,
									label,
								},
							];
						next.sort(
							(
								a,
								b,
							) =>
								String(
									a.label,
								).localeCompare(
									String(
										b.label,
									),
								),
						);
						return next;
					},
				);
				const namePart =
					String(
						label ||
							"",
					)
						.split(
							"—",
						)[0]
						.trim();
				const nameKey =
					normalizeNameKey(
						namePart,
					);
				if (
					nameKey
				) {
					setCastNameKeys(
						(
							prev,
						) =>
							prev.includes(
								nameKey,
							)
								? prev
								: [
										...prev,
										nameKey,
									],
					);
				}
				setSelectedCastIds(
					(
						prev,
					) =>
						prev.includes(
							newId,
						)
							? prev
							: [
									...prev,
									newId,
								],
				);
			},
			[],
		);

	const addTime =
		(
			showIdx,
		) => {
			setShowsPayload(
				(
					prev,
				) => ({
					shows:
						(
							prev?.shows ||
							[]
						).map(
							(
								s,
								i,
							) =>
								i ===
								showIdx
									? {
											...s,
											times:
												[
													...(s.times ||
														[]),
													{
														show_time:
															"",
														notes:
															"",
													},
												],
										}
									: s,
						),
				}),
			);
		};

	const removeTime =
		(
			showIdx,
			timeIdx,
		) => {
			setShowsPayload(
				(
					prev,
				) => ({
					shows:
						(
							prev?.shows ||
							[]
						).map(
							(
								s,
								i,
							) =>
								i ===
								showIdx
									? {
											...s,
											times:
												(
													s.times ||
													[]
												).filter(
													(
														_,
														j,
													) =>
														j !==
														timeIdx,
												),
										}
									: s,
						),
				}),
			);
		};

	const updateTime =
		(
			showIdx,
			timeIdx,
			key,
			value,
		) => {
			setShowsPayload(
				(
					prev,
				) => ({
					shows:
						(
							prev?.shows ||
							[]
						).map(
							(
								s,
								i,
							) => {
								if (
									i !==
									showIdx
								)
									return s;
								const times =
									(
										s.times ||
										[]
									).map(
										(
											t,
											j,
										) =>
											j ===
											timeIdx
												? {
														...t,
														[key]:
															value,
													}
												: t,
									);
								return {
									...s,
									times,
								};
							},
						),
				}),
			);
		};

	const onSave =
		async () => {
			setIsSaving(
				true,
			);
			try {
				const showErrs =
					validateShowsPayload(
						showsPayload,
					);
				if (
					showErrs.length
				) {
					sendNoticeRef.current?.(
						{
							type: "error",
							message:
								showErrs[0],
						},
					);
					setIsSaving(
						false,
					);
					return;
				}
				const showsPayloadNormalized =
					normalizeShowsPayloadForSave(
						showsPayload,
					);
				const payload =
					{
						...(record?.params ||
							{}),
						shows_payload:
							JSON.stringify(
								showsPayloadNormalized,
							),
						gallery_payload:
							JSON.stringify(
								{
									images:
										galleryImages.map(
											(
												g,
												i,
											) => ({
												image_path:
													g.image_path,
												sort_order:
													i,
											}),
										),
								},
							),
						casts_payload:
							JSON.stringify(
								{
									cast_ids:
										selectedCastIds,
								},
							),
					};

				if (
					isEdit
				) {
					const res =
						await api.recordAction(
							{
								resourceId:
									resource.id,
								recordId:
									listingId,
								actionName:
									"edit",
								data: payload,
							},
						);
					if (
						res
							?.data
							?.notice
					)
						sendNotice(
							res
								.data
								.notice,
						);
				} else {
					const res =
						await api.resourceAction(
							{
								resourceId:
									resource.id,
								actionName:
									"new",
								data: payload,
							},
						);
					if (
						res
							?.data
							?.notice
					)
						sendNotice(
							res
								.data
								.notice,
						);
				}
			} catch (e) {
				sendNotice(
					{
						type: "error",
						message:
							e?.message ||
							String(
								e,
							),
					},
				);
			} finally {
				setIsSaving(
					false,
				);
			}
		};

	return (
		<Box variant="white">
			<H2>
				{isEdit
					? "Edit Listing"
					: "New Listing"}
			</H2>
			<Box
				display="flex"
				gap="sm"
				borderBottom="1px solid"
				borderColor="grey40"
				mb="xl"
				flexWrap="wrap"
			>
				<Button
					type="button"
					variant={
						activeTab ===
						"listing"
							? "contained"
							: "text"
					}
					onClick={() =>
						setActiveTab(
							"listing",
						)
					}
				>
					Listing
				</Button>
				<Button
					type="button"
					variant={
						activeTab ===
						"media"
							? "contained"
							: "text"
					}
					onClick={() =>
						setActiveTab(
							"media",
						)
					}
				>
					Media
				</Button>
				<Button
					type="button"
					variant={
						activeTab ===
						"shows"
							? "contained"
							: "text"
					}
					onClick={() =>
						setActiveTab(
							"shows",
						)
					}
				>
					Shows
					&amp;
					times
				</Button>
			</Box>

			{activeTab ===
			"listing" ? (
				<Box mt="xl">
					{listingProperties.map(
						(
							property,
						) => (
							<BasePropertyComponent
								key={
									property.propertyPath
								}
								where="edit"
								property={
									property
								}
								resource={
									resource
								}
								record={
									record
								}
								onChange={
									handleListingFieldChange
								}
							/>
						),
					)}

					<Box mt="xl">
						<Label>
							Description
						</Label>
						<Box
							mt="sm"
							style={{
								minHeight: 300,
							}}
						>
							<ReactQuill
								theme="snow"
								value={String(
									record
										?.params
										?.description_html ||
										"",
								)}
								onChange={(
									html,
								) =>
									handlePropertyChange(
										"description_html",
										html,
									)
								}
								style={{
									height: 300,
								}}
								modules={{
									toolbar:
										[
											[
												{
													header:
														[
															1,
															2,
															3,
															false,
														],
												},
											],
											[
												"bold",
												"italic",
												"underline",
												"strike",
											],
											[
												{
													list: "ordered",
												},
												{
													list: "bullet",
												},
											],
											[
												"blockquote",
												"code-block",
											],
											[
												"link",
												"image",
											],
											[
												{
													color:
														[],
												},
												{
													background:
														[],
												},
											],
											[
												{
													align:
														[],
												},
											],
											[
												"clean",
											],
										],
								}}
							/>
						</Box>
					</Box>

					<Box mt="xxl">
						<Label>
							Cast
						</Label>
						<Box
							display="flex"
							gap="sm"
							alignItems="flex-end"
							flexWrap="nowrap"
						>
							<Box
								flex={
									1
								}
								style={{
									minWidth: 0,
								}}
							>
								<Select
									isMulti
									isLoading={
										isCastsLoading
									}
									options={
										castOptions
									}
									placeholder="Search & select cast…"
									value={castOptions.filter(
										(
											o,
										) =>
											selectedCastIds.includes(
												String(
													o.value,
												),
											),
									)}
									onChange={(
										opts,
									) =>
										setSelectedCastIds(
											(
												opts ||
												[]
											).map(
												(
													o,
												) =>
													String(
														o.value,
													),
											),
										)
									}
								/>
							</Box>
							<Button
								type="button"
								variant="text"
								size="sm"
								title="Add new cast"
								onClick={() =>
									setCastModalOpen(
										true,
									)
								}
								style={{
									flexShrink: 0,
									paddingLeft: 8,
									paddingRight: 8,
								}}
							>
								<Icon
									icon="Plus"
									size={
										22
									}
								/>
							</Button>
						</Box>
						<Text
							variant="sm"
							color="grey60"
							mt="sm"
						>
							Tip:
							Manage
							cast
							profiles
							in
							Dashboard
							→
							Users
							→
							Cast.
						</Text>
					</Box>
				</Box>
			) : activeTab ===
			  "media" ? (
				<Box mt="xl">
					<Text
						variant="sm"
						mb="lg"
					>
						Banner
						image,
						trailer
						URL,
						and
						gallery
						images
						for
						this
						listing.
					</Text>

					<Box mt="lg">
						<Label>
							Banner
							image
						</Label>
						<input
							type="file"
							accept="image/*"
							onChange={
								onUploadBanner
							}
							disabled={
								bannerUploading
							}
						/>
						<Box mt="sm">
							<Text variant="sm">
								Saved
								path:{" "}
								{record
									?.params
									?.banner_image ||
									"(none)"}
							</Text>
						</Box>
						{record
							?.params
							?.banner_image ? (
							<Box mt="md">
								<Box
									as="img"
									src={`/admin/uploads-root/${encodeURIComponent(String(record.params.banner_image).split("/").pop() || "")}`}
									alt="Banner"
									style={{
										width:
											"100%",
										maxWidth: 520,
										height: 240,
										objectFit:
											"cover",
										borderRadius: 12,
										border:
											"1px solid rgba(0,0,0,0.08)",
									}}
								/>
							</Box>
						) : null}
					</Box>

					<Box mt="lg">
						<Label>
							Trailer
							URL
						</Label>
						<Input
							value={
								record
									?.params
									?.trailer_url ||
								""
							}
							onChange={(
								e,
							) =>
								handlePropertyChange(
									"trailer_url",
									e
										.target
										.value,
								)
							}
							placeholder="https://youtube.com/watch?v=..."
						/>
					</Box>

					<Box mt="xl">
						<Label>
							Gallery
							images
							(max
							10,
							4MB
							each)
						</Label>
						<input
							type="file"
							accept="image/*"
							multiple
							onChange={
								onAddGalleryFiles
							}
							disabled={
								isUploading
							}
						/>
						<Box mt="sm">
							<Text variant="sm">
								{
									galleryImages.length
								}
								/10
								images{" "}
								{isUploading
									? "(uploading...)"
									: ""}
							</Text>
						</Box>

						{galleryImages.length ? (
							<Box
								mt="lg"
								display="grid"
								gridTemplateColumns="1fr"
								gridGap="8px"
							>
								{galleryImages.map(
									(
										g,
										idx,
									) => (
										<Box
											key={`${g.image_path}-${idx}`}
											p="md"
											border="1px solid"
											borderColor="grey20"
											borderRadius="default"
											display="flex"
											justifyContent="space-between"
											alignItems="center"
											style={{
												gap: 12,
											}}
										>
											<Box
												display="flex"
												alignItems="center"
												style={{
													gap: 12,
												}}
											>
												<Box
													as="img"
													src={
														g.publicUrl ||
														`/admin/uploads-root/${encodeURIComponent(String(g.image_path).split("/").pop() || "")}`
													}
													alt={`Gallery ${idx + 1}`}
													style={{
														width: 88,
														height: 56,
														objectFit:
															"cover",
														borderRadius: 8,
														border:
															"1px solid rgba(0,0,0,0.08)",
													}}
												/>
												<Text variant="sm">
													{
														g.image_path
													}
												</Text>
											</Box>
											<Button
												type="button"
												variant="danger"
												size="sm"
												onClick={() =>
													setGalleryImages(
														(
															prev,
														) =>
															prev.filter(
																(
																	_,
																	i,
																) =>
																	i !==
																	idx,
															),
													)
												}
											>
												Remove
											</Button>
										</Box>
									),
								)}
							</Box>
						) : null}
					</Box>
				</Box>
			) : (
				<Box mt="xl">
					<Text
						variant="sm"
						mb="lg"
					>
						Shows
						and
						show
						times
						are
						saved
						together
						with
						the
						listing.
					</Text>

					<Button
						type="button"
						variant="primary"
						onClick={
							addShow
						}
					>
						Add
						show
					</Button>

					{(
						showsPayload?.shows ||
						[]
					)
						.length ===
					0 ? (
						<Box mt="xl">
							<Text>
								No
								shows
								added
								yet.
							</Text>
						</Box>
					) : null}

					{(
						showsPayload?.shows ||
						[]
					).map(
						(
							s,
							showIdx,
						) => {
							const isOpen =
								Boolean(
									s?.__key &&
									openShowKey ===
										s.__key,
								);
							const toggle =
								() =>
									setOpenShowKey(
										(
											prev,
										) =>
											prev ===
											s.__key
												? null
												: s.__key,
									);

							return (
								<Box
									key={
										s?.__key ||
										showIdx
									}
									mt="xl"
									border="1px solid"
									borderColor="grey40"
									borderRadius="lg"
								>
									<Box
										as="button"
										type="button"
										onClick={
											toggle
										}
										display="flex"
										justifyContent="space-between"
										alignItems="center"
										width="100%"
										p="xl"
										style={{
											cursor:
												"pointer",
											background:
												"transparent",
											border: 0,
											textAlign:
												"left",
										}}
										aria-expanded={
											isOpen
										}
									>
										<H2
											style={{
												margin: 0,
											}}
										>
											Show
											#
											{showIdx +
												1}
										</H2>
										<Text
											variant="sm"
											color="grey60"
										>
											{isOpen
												? "Collapse"
												: "Expand"}
										</Text>
									</Box>

									{isOpen ? (
										<Box
											px="xl"
											pb="xl"
										>
											<Box
												display="flex"
												justifyContent="flex-end"
											>
												<Button
													type="button"
													variant="danger"
													size="sm"
													onClick={() =>
														removeShow(
															showIdx,
														)
													}
												>
													Remove
												</Button>
											</Box>

											<Box mt="lg">
												<Label>
													Place
												</Label>
												<Box
													display="flex"
													gap="sm"
													alignItems="flex-end"
													flexWrap="nowrap"
												>
													<Box
														flex={
															1
														}
														style={{
															minWidth: 0,
														}}
													>
														<Select
															isLoading={
																isPlacesLoading
															}
															options={
																placeOptions
															}
															placeholder="Select a place…"
															value={
																placeOptions.find(
																	(
																		o,
																	) =>
																		String(
																			o.value,
																		) ===
																		String(
																			s.place_id,
																		),
																) ||
																null
															}
															onChange={(
																opt,
															) =>
																updateShow(
																	showIdx,
																	"place_id",
																	opt?.value ||
																		"",
																)
															}
														/>
													</Box>
													<Button
														type="button"
														variant="text"
														size="sm"
														title="Add new place"
														onClick={() =>
															openAddPlaceModal(
																showIdx,
															)
														}
														style={{
															flexShrink: 0,
															paddingLeft: 8,
															paddingRight: 8,
														}}
													>
														<Icon
															icon="Plus"
															size={
																22
															}
														/>
													</Button>
												</Box>
											</Box>

											{s.place_id &&
											placeMetaById?.[
												String(
													s.place_id,
												)
											]
												?.google_map_link ? (
												<Box mt="md">
													<Label>
														Google
														Maps
														link
													</Label>
													<Box
														display="flex"
														gap="sm"
														alignItems="center"
														flexWrap="wrap"
													>
														<Button
															as="a"
															href={
																placeMetaById[
																	String(
																		s.place_id,
																	)
																]
																	.google_map_link
															}
															target="_blank"
															rel="noreferrer"
															variant="secondary"
															size="sm"
														>
															🗺️
															Open
															map
														</Button>
													</Box>
													<Box mt="sm">
														<TextArea
															value={
																placeMetaById[
																	String(
																		s.place_id,
																	)
																]
																	.google_map_link
															}
															disabled
															rows={
																2
															}
															style={{
																width:
																	"100%",
															}}
														/>
													</Box>
												</Box>
											) : null}

											<Box
												mt="lg"
												display="grid"
												gridTemplateColumns="1fr 1fr"
												gridGap="16px"
											>
												<Box>
													<Label>
														Start
														date
													</Label>
													<DatePicker
														propertyType="date"
														value={showDateToPickerIso(
															s.start_date,
														)}
														maxDate={parseShowBoundaryDate(
															s.end_date,
														)}
														style={{
															maxWidth: 300,
															width:
																"100%",
														}}
														onChange={(
															iso,
														) =>
															updateShow(
																showIdx,
																"start_date",
																iso
																	? String(
																			iso,
																		).slice(
																			0,
																			10,
																		)
																	: "",
															)
														}
													/>
												</Box>
												<Box>
													<Label>
														End
														date
													</Label>
													<DatePicker
														propertyType="date"
														value={showDateToPickerIso(
															s.end_date,
														)}
														minDate={parseShowBoundaryDate(
															s.start_date,
														)}
														style={{
															maxWidth: 300,
															width:
																"100%",
														}}
														onChange={(
															iso,
														) =>
															updateShow(
																showIdx,
																"end_date",
																iso
																	? String(
																			iso,
																		).slice(
																			0,
																			10,
																		)
																	: "",
															)
														}
													/>
												</Box>
											</Box>

											<Box
												mt="lg"
												display="grid"
												gridTemplateColumns="1fr 1fr"
												gridGap="16px"
											>
												<Box>
													<Label>
														Publish
														at
													</Label>
													<DatePicker
														propertyType="date"
														value={showDateToPickerIso(
															s.publish_at,
														)}
														maxDate={parseShowBoundaryDate(
															s.unpublish_at,
														)}
														style={{
															maxWidth: 300,
															width:
																"100%",
														}}
														onChange={(
															iso,
														) =>
															updateShow(
																showIdx,
																"publish_at",
																iso
																	? String(
																			iso,
																		).slice(
																			0,
																			10,
																		) +
																			" 00:00:00"
																	: "",
															)
														}
													/>
												</Box>
												<Box>
													<Label>
														Unpublish
														at
													</Label>
													<DatePicker
														propertyType="date"
														value={showDateToPickerIso(
															s.unpublish_at,
														)}
														minDate={parseShowBoundaryDate(
															s.publish_at,
														)}
														style={{
															maxWidth: 300,
															width:
																"100%",
														}}
														onChange={(
															iso,
														) =>
															updateShow(
																showIdx,
																"unpublish_at",
																iso
																	? String(
																			iso,
																		).slice(
																			0,
																			10,
																		) +
																			" 00:00:00"
																	: "",
															)
														}
													/>
												</Box>
											</Box>

											<Box mt="lg">
												<Label>
													Booking
													URL
												</Label>
												<Input
													value={
														s.booking_url
													}
													onChange={(
														e,
													) =>
														updateShow(
															showIdx,
															"booking_url",
															e
																.target
																.value,
														)
													}
												/>
											</Box>

											<Box mt="lg">
												<Label>
													Ticket
													cost
												</Label>
												<Input
													value={
														s.ticket_cost
													}
													onChange={(
														e,
													) =>
														updateShow(
															showIdx,
															"ticket_cost",
															e
																.target
																.value,
														)
													}
												/>
											</Box>

											<Box mt="xl">
												<Box
													display="flex"
													justifyContent="space-between"
													alignItems="center"
												>
													<Text variant="lg">
														Show
														times
													</Text>
													<Button
														type="button"
														variant="secondary"
														size="sm"
														onClick={() =>
															addTime(
																showIdx,
															)
														}
													>
														Add
														time
													</Button>
												</Box>

												{(
													s.times ||
													[]
												).map(
													(
														t,
														timeIdx,
													) => (
														<Box
															key={
																timeIdx
															}
															mt="lg"
															p="lg"
															border="1px solid"
															borderColor="grey20"
															borderRadius="default"
														>
															<Box
																display="flex"
																justifyContent="space-between"
																alignItems="center"
															>
																<Text>
																	Time
																	#
																	{timeIdx +
																		1}
																</Text>
																<Button
																	type="button"
																	variant="danger"
																	size="sm"
																	onClick={() =>
																		removeTime(
																			showIdx,
																			timeIdx,
																		)
																	}
																>
																	Remove
																</Button>
															</Box>

															<Box mt="md">
																<Label>
																	Show
																	time
																</Label>
																<Input
																	type="time"
																	value={
																		t.show_time
																			? String(
																					t.show_time,
																				).slice(
																					11,
																					16,
																				)
																			: ""
																	}
																	onChange={(
																		e,
																	) => {
																		const time =
																			String(
																				e
																					.target
																					.value ||
																					"",
																			).trim();
																		if (
																			!time
																		) {
																			updateTime(
																				showIdx,
																				timeIdx,
																				"show_time",
																				"",
																			);
																			return;
																		}
																		const date =
																			String(
																				s?.start_date ||
																					"",
																			).trim() ||
																			new Date()
																				.toISOString()
																				.slice(
																					0,
																					10,
																				);
																		updateTime(
																			showIdx,
																			timeIdx,
																			"show_time",
																			`${date} ${time}:00`,
																		);
																	}}
																	style={{
																		maxWidth: 300,
																		width:
																			"100%",
																	}}
																/>
															</Box>

															<Box mt="md">
																<Label>
																	Notes
																</Label>
																<TextArea
																	value={
																		t.notes
																	}
																	onChange={(
																		e,
																	) =>
																		updateTime(
																			showIdx,
																			timeIdx,
																			"notes",
																			e
																				.target
																				.value,
																		)
																	}
																	rows={
																		4
																	}
																	style={{
																		height: 100,
																		width:
																			"100%",
																	}}
																/>
															</Box>
														</Box>
													),
												)}
											</Box>
										</Box>
									) : null}
								</Box>
							);
						},
					)}
				</Box>
			)}

			<ListingAddPlaceModal
				isOpen={
					placeModalOpen
				}
				onClose={
					closeAddPlaceModal
				}
				api={
					api
				}
				cityOptions={
					cityOptions
				}
				isCitiesLoading={
					isCitiesLoading
				}
				draft={
					newPlaceDraft
				}
				setDraft={
					setNewPlaceDraft
				}
				isSavingPlace={
					isSavingPlace
				}
				onSave={
					saveNewPlace
				}
			/>

			<ListingAddCastModal
				isOpen={
					castModalOpen
				}
				onClose={() =>
					setCastModalOpen(
						false,
					)
				}
				api={
					api
				}
				sendNotice={
					sendNotice
				}
				sendNoticeRef={
					sendNoticeRef
				}
				onCastCreated={
					handleCastCreated
				}
				existingCastNameKeys={
					castNameKeys
				}
			/>

			<Box mt="xxl">
				<Button
					type="button"
					variant="primary"
					onClick={
						onSave
					}
					disabled={
						isSaving
					}
				>
					{isSaving
						? "Saving…"
						: "Save"}
				</Button>
			</Box>
		</Box>
	);
}
