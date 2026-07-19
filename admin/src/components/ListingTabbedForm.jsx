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
	CheckBox,
	H2,
	Icon,
	Input,
	Label,
	Select,
	Text,
	TextArea,
} from "@adminjs/design-system";
import StableModal from "./StableModal.jsx";
import ImageDropzone from "./ImageDropzone.jsx";
import ListingPublishDate from "./ListingPublishDate.jsx";
import ListingUnpublishDate from "./ListingUnpublishDate.jsx";
import ModernDatePicker from "./ModernDatePicker.jsx";
import ModernTimePicker from "./ModernTimePicker.jsx";
import FormSaveChrome from "./FormSaveChrome.jsx";
import { normalizeListingDatetime } from "./listingDateUtils.js";

function toListingMediaUrl(storedPath) {
	const fileName =
		String(
			storedPath ||
				"",
		)
			.split(
				"/",
			)
			.pop() ||
		"";
	return fileName
		? `/admin/uploads-root/${encodeURIComponent(fileName)}`
		: null;
}

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
			params: {
				status: "draft",
				is_featured: false,
				show_countdown: true,
			},
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
	if (
		!String(
			params.status ??
				"",
		).trim()
	) {
		params.status = "draft";
	}
	if (
		params.is_featured ===
			undefined ||
		params.is_featured ===
			null ||
		params.is_featured ===
			""
	) {
		params.is_featured = false;
	}
	if (
		params.show_countdown ===
			undefined ||
		params.show_countdown ===
			null ||
		params.show_countdown ===
			""
	) {
		params.show_countdown = true;
	}
	for (const key of [
		"publish_at",
		"unpublish_at",
	]) {
		if (
			params[
				key
			] !=
				null &&
			params[
				key
			] !==
				""
		) {
			params[
				key
			] =
				normalizeListingDatetime(
					params[
						key
					],
				);
		}
	}
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
			return start || "";
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

function parseShowBoundaryDate(
	value,
) {
	const ymd =
		extractShowCalendarYmd(
			value,
		);
	if (
		!ymd
	)
		return undefined;
	const [
		y,
		m,
		d,
	] =
		ymd
			.split(
				"-",
			)
			.map(
				Number,
			);
	return new Date(
		y,
		m -
			1,
		d,
		12,
		0,
		0,
		0,
	);
}

function showPlaceLabel(
	show,
	placeOptions,
) {
	const placeId =
		show?.place_id !=
		null
			? String(
					show.place_id,
				)
			: "";
	if (
		!placeId
	)
		return "No place";
	const match =
		(
			placeOptions ||
			[]
		).find(
			(
				o,
			) =>
				String(
					o.value,
				) ===
				placeId,
		);
	return (
		match?.label ||
		`Place #${placeId}`
	);
}

function showDateLabel(
	show,
) {
	const startYmd =
		extractShowCalendarYmd(
			show?.start_date,
		);
	const endYmd =
		extractShowCalendarYmd(
			show?.end_date,
		);
	if (
		startYmd &&
		endYmd &&
		startYmd !==
			endYmd
	) {
		return `${startYmd} → ${endYmd}`;
	}
	if (
		startYmd
	)
		return startYmd;
	if (
		endYmd
	)
		return endYmd;
	const times =
		Array.isArray(
			show?.times,
		)
			? show.times
			: [];
	for (const t of times) {
		const ymd =
			extractShowCalendarYmd(
				t?.show_time,
			);
		if (
			ymd
		)
			return ymd;
	}
	return "No date";
}

function showMatchesSearch(
	show,
	showIdx,
	query,
	placeOptions,
) {
	const q =
		String(
			query ||
				"",
		)
			.trim()
			.toLowerCase();
	if (
		!q
	)
		return true;
	const place =
		showPlaceLabel(
			show,
			placeOptions,
		);
	const date =
		showDateLabel(
			show,
		);
	const times =
		Array.isArray(
			show?.times,
		)
			? show.times
			: [];
	const timeBits =
		times
			.map(
				(
					t,
				) =>
					[
						t?.show_time,
						t?.notes,
					]
						.filter(
							Boolean,
						)
						.join(
							" ",
						),
			)
			.join(
				" ",
			);
	const hay =
		[
			`show #${showIdx + 1}`,
			`#${showIdx + 1}`,
			place,
			date,
			show?.start_date,
			show?.end_date,
			show?.booking_url,
			show?.ticket_price,
			timeBits,
		]
			.filter(
				Boolean,
			)
			.join(
				" ",
			)
			.toLowerCase();
	return hay.includes(
		q,
	);
}

function showsHaveUserInput(
	showsPayload,
) {
	const shows =
		Array.isArray(
			showsPayload?.shows,
		)
			? showsPayload.shows
			: [];
	return shows.some(
		(
			s,
		) => {
			if (
				String(
					s?.place_id ||
						"",
				).trim()
			)
				return true;
			if (
				extractShowCalendarYmd(
					s?.start_date,
				)
			)
				return true;
			if (
				extractShowCalendarYmd(
					s?.end_date,
				)
			)
				return true;
			const times =
				Array.isArray(
					s?.times,
				)
					? s.times
					: [];
			return times.some(
				(
					t,
				) =>
					String(
						t?.show_time ||
							"",
					).trim(),
			);
		},
	);
}

function firstRecordErrorMessage(
	errObj,
	fallback,
) {
	if (
		!errObj ||
		typeof errObj !==
			"object"
	)
		return fallback;
	for (const val of Object.values(
		errObj,
	)) {
		if (
			val &&
			typeof val ===
				"object" &&
			val.message
		) {
			return String(
				val.message,
			);
		}
	}
	return fallback;
}

function sanitizeListingFormParams(
	params,
) {
	const out =
		{
			...params,
		};
	for (const key of [
		"description_html",
		"banner_image",
		"detail_banner_image",
		"trailer_url",
		"sponsor_banner_image",
		"sponsor_banner_url",
		"publish_at",
		"unpublish_at",
	]) {
		const v =
			out[
				key
			];
		if (
			v ===
				"" ||
			v ==
				null
		) {
			out[
				key
			] = null;
			continue;
		}
		if (
			v instanceof
				Date &&
			Number.isNaN(
				v.getTime(),
			)
		) {
			out[
				key
			] = null;
			continue;
		}
		if (
			typeof v ===
				"object" &&
			!Array.isArray(
				v,
			) &&
			Object.keys(
				v,
			).length ===
				0
		) {
			out[
				key
			] = null;
		}
	}
	if (
		out.is_featured ===
			undefined ||
		out.is_featured ===
			null ||
		out.is_featured ===
			""
	) {
		out.is_featured = false;
	}
	if (
		out.show_countdown ===
			undefined ||
		out.show_countdown ===
			null ||
		out.show_countdown ===
			""
	) {
		out.show_countdown = true;
	} else if (
		out.show_countdown ===
			true ||
		out.show_countdown ===
			"true" ||
		out.show_countdown ===
			"1" ||
		out.show_countdown ===
			1
	) {
		out.show_countdown = true;
	} else {
		out.show_countdown = false;
	}
	if (
		out.organizer_partner_id ===
			undefined ||
		out.organizer_partner_id ===
			null ||
		String(
			out.organizer_partner_id,
		).trim() ===
			""
	) {
		out.organizer_partner_id =
			null;
	} else {
		out.organizer_partner_id =
			String(
				out.organizer_partner_id,
			).trim();
	}
	return out;
}

const LISTING_SAVE_KEYS = [
	"type_id",
	"title",
	"slug",
	"description_html",
		"banner_image",
		"detail_banner_image",
		"trailer_url",
		"sponsor_banner_image",
		"sponsor_banner_url",
		"organizer_partner_id",
		"status",
		"is_featured",
		"show_countdown",
		"publish_at",
		"unpublish_at",
	];

function pickListingSaveParams(
	params,
) {
	const clean =
		sanitizeListingFormParams(
			params &&
				typeof params ===
					"object"
				? {
						...params,
					}
				: {},
		);
	const out =
		{};
	for (const key of LISTING_SAVE_KEYS) {
		if (
			!Object.prototype.hasOwnProperty.call(
				clean,
				key,
			)
		)
			continue;
		let v =
			clean[
				key
			];
		if (
			key ===
				"type_id" &&
			v &&
			typeof v ===
				"object"
		) {
			v =
				v
					?.params
					?.id ??
				v?.id;
		}
		if (
			v !==
			undefined
		) {
			out[
				key
			] = v;
		}
	}
	return out;
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
					publish_at: "",
					unpublish_at: "",
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
		showsSearch,
		setShowsSearch,
	] =
		useState(
			"",
		);
	const [
		isSaving,
		setIsSaving,
	] =
		useState(
			false,
		);
	const [
		savedListingId,
		setSavedListingId,
	] =
		useState(
			null,
		);
	const [
		partnerOptions,
		setPartnerOptions,
	] =
		useState(
			[],
		);

	const isEdit =
		action?.name ===
		"edit";
	/** After first create on the new form, keep using edit for later saves on the same page. */
	const listingId =
		isEdit
			? (initialRecord?.id ??
				record?.id)
			: savedListingId;
	const saveAsEdit =
		isEdit ||
		savedListingId !=
			null;

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
		setSavedListingId(
			null,
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
						"detail_banner_image" &&
					p.propertyPath !==
						"trailer_url" &&
					p.propertyPath !==
						"sponsor_banner_image" &&
					p.propertyPath !==
						"sponsor_banner_url" &&
					p.propertyPath !==
						"organizer_partner_id" &&
					p.propertyPath !==
						"show_countdown" &&
					p.propertyPath !==
						"description_html" &&
					p.propertyPath !==
						"created_at" &&
					p.propertyPath !==
						"updated_at" &&
					p.propertyPath !==
						"created_by_admin_id" &&
					p.propertyPath !==
						"updated_by_admin_id" &&
					p.propertyPath !==
						"publish_at" &&
					p.propertyPath !==
						"unpublish_at",
			);
		}, [
			resource,
		]);

	const publishAtProperty = {
		path: "publish_at",
		propertyPath: "publish_at",
		label: "Publish at",
	};
	const unpublishAtProperty = {
		path: "unpublish_at",
		propertyPath: "unpublish_at",
		label: "Unpublish at",
	};

	useEffect(() => {
		ensureQuillStylesheet();
	}, []);

	useEffect(() => {
		let cancelled = false;
		const run = async () => {
			try {
				const res = await fetch("/admin/api/settings/partners", {
					credentials: "include",
					cache: "no-store",
				});
				if (!res.ok) return;
				const data = await res.json();
				const logos = Array.isArray(data?.settings?.logos)
					? data.settings.logos
					: [];
				if (cancelled) return;
				setPartnerOptions(
					logos
						.filter((logo) => logo && String(logo.id || "").trim())
						.map((logo) => ({
							id: String(logo.id).trim(),
							name: String(logo.name || "").trim() || String(logo.id).trim(),
							enabled: logo.enabled !== false && logo.enabled !== 0 && logo.enabled !== "0",
						})),
				);
			} catch {
				if (!cancelled) setPartnerOptions([]);
			}
		};
		void run();
		return () => {
			cancelled = true;
		};
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
			!saveAsEdit ||
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
		saveAsEdit,
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
			!saveAsEdit ||
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
		saveAsEdit,
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

	const processGalleryFiles =
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
				list.slice(
					0,
					remaining,
				);
			setIsUploading(
				true,
			);
			try {
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
			}
		};

	const uploadBannerFiles =
		async (
			files,
			field,
			label,
		) => {
			const file =
				files?.[0];
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
						message: `${label} must be <= 4MB`,
					},
				);
				return;
			}
			setBannerUploading(
				true,
			);
			try {
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
					field,
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
			}
		};

	const onUploadBanner =
		async (
			files,
		) => {
			await uploadBannerFiles(
				files,
				"banner_image",
				"Banner image",
			);
		};

	const onUploadDetailBanner =
		async (
			files,
		) => {
			await uploadBannerFiles(
				files,
				"detail_banner_image",
				"Detail banner image",
			);
		};

	const onUploadSponsorBanner =
		async (
			files,
		) => {
			await uploadBannerFiles(
				files,
				"sponsor_banner_image",
				"Sponsor banner",
			);
		};

	useEffect(() => {
		if (
			!saveAsEdit ||
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
						let timeRecords =
							[];
						try {
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
							timeRecords =
								Array.isArray(
									timesList
										?.data
										?.records,
								)
									? timesList
											.data
											.records
									: [];
						} catch {
							timeRecords =
								[];
						}
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
		saveAsEdit,
		listingId,
		api,
	]);

	const addShow =
		() => {
			const next =
				makeEmptyShow();
			setShowsSearch(
				"",
			);
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
				const params =
					record?.params ||
					{};
				const title =
					String(
						params.title ||
							"",
					).trim();
				const slug =
					String(
						params.slug ||
							"",
					).trim();
				const typeId =
					params.type_id;
				if (
					!typeId
				) {
					sendNoticeRef.current?.(
						{
							type: "error",
							message:
								"Type is required.",
						},
					);
					return;
				}
				if (
					!title
				) {
					sendNoticeRef.current?.(
						{
							type: "error",
							message:
								"Title is required.",
						},
					);
					return;
				}
				if (
					!slug
				) {
					sendNoticeRef.current?.(
						{
							type: "error",
							message:
								"Slug is required.",
						},
					);
					return;
				}

				const showErrs =
					showsHaveUserInput(
						showsPayload,
					)
						? validateShowsPayload(
								showsPayload,
							)
						: [];
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
				const baseParams =
					pickListingSaveParams(
						record?.params ||
							{},
					);
				const payload =
					{
						...baseParams,
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

				const applySaveResponse =
					(
						res,
					) => {
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
						const notice =
							res
								?.data
								?.notice;
						const hasFieldErrors =
							errObj &&
							Object.keys(
								errObj,
							)
								.length >
								0;

						if (
							hasFieldErrors ||
							notice?.type ===
								"error"
						) {
							if (
								rec
							) {
								setRecord(
									(
										prev,
									) =>
										buildRecordState(
											{
												...prev,
												...rec,
												id:
													prev?.id ??
													rec?.id ??
													rec
														?.params
														?.id,
												params:
													{
														...(prev?.params ||
															{}),
														...(rec?.params &&
														typeof rec.params ===
															"object"
															? rec.params
															: {}),
													},
												errors:
													hasFieldErrors
														? errObj
														: prev?.errors ||
															{},
											},
										),
								);
							}
							sendNotice(
								{
									type: "error",
									message:
										firstRecordErrorMessage(
											errObj,
											notice?.message ===
												"thereWereValidationErrors"
												? "Please fix the highlighted fields below."
												: notice?.message ||
													"Could not save listing.",
										),
								},
							);
							return false;
						}

						if (
							notice
						) {
							sendNotice(
								notice,
							);
						}

						const newId =
							extractAdminRecordId(
								rec,
							);
						if (
							newId &&
							!saveAsEdit
						) {
							setSavedListingId(
								newId,
							);
							setRecord(
								(
									prev,
								) => ({
									...prev,
									id: newId,
									params:
										{
											...(prev?.params ||
												{}),
											...(rec?.params &&
											typeof rec.params ===
												"object"
												? rec.params
												: {}),
										},
									errors:
										{},
								}),
							);
						}
						return true;
					};

				if (
					saveAsEdit
				) {
					const res =
						await api.recordAction(
							{
								resourceId:
									resource.id,
								recordId:
									String(
										listingId,
									),
								actionName:
									"edit",
								data: payload,
							},
						);
					applySaveResponse(
						res,
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
					applySaveResponse(
						res,
					);
				}
			} catch (e) {
				const apiMsg =
					e?.response
						?.data
						?.notice
						?.message ||
					e?.response
						?.data
						?.message ||
					e?.response
						?.data
						?.error ||
					e?.message;
				sendNotice(
					{
						type: "error",
						message:
							apiMsg ||
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

	const filteredShows =
		useMemo(
			() => {
				const all =
					Array.isArray(
						showsPayload?.shows,
					)
						? showsPayload.shows
						: [];
				return all
					.map(
						(
							s,
							showIdx,
						) => ({
							s,
							showIdx,
						}),
					)
					.filter(
						({
							s,
							showIdx,
						}) =>
							showMatchesSearch(
								s,
								showIdx,
								showsSearch,
								placeOptions,
							),
					);
			},
			[
				showsPayload,
				showsSearch,
				placeOptions,
			],
		);

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

			<FormSaveChrome
				onSave={onSave}
				saving={isSaving}
				saveLabel="Save"
				savingLabel="Saving…"
			>
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

					<Box mb="xl">
						<Label mb="sm">Organizer (Partner)</Label>
						<Text variant="sm" color="grey60" mb="md">
							Partners from Site settings → Partners slider. Shown as “Organized by” on the listing detail page.
						</Text>
						<select
							value={String(record?.params?.organizer_partner_id || "")}
							onChange={(e) =>
								handleListingFieldChange(
									"organizer_partner_id",
									e.target.value || null,
								)
							}
							style={{
								width: "100%",
								maxWidth: 420,
								boxSizing: "border-box",
								padding: "10px 12px",
								borderRadius: 8,
								border: "1px solid #d4d4d8",
								fontSize: 14,
								background: "#fff",
							}}
						>
							<option value="">— None —</option>
							{partnerOptions.map((opt) => (
								<option key={opt.id} value={opt.id}>
									{opt.name}
									{opt.enabled ? "" : " (disabled)"}
								</option>
							))}
						</select>
					</Box>

					<Box mb="xl">
						<CheckBox
							id="listing-show-countdown"
							checked={Boolean(
								record?.params?.show_countdown === 1 ||
									record?.params?.show_countdown === "1" ||
									record?.params?.show_countdown === true,
							)}
							onChange={(e) =>
								handleListingFieldChange(
									"show_countdown",
									e.target.checked ? 1 : 0,
								)
							}
						/>
						<Label inline htmlFor="listing-show-countdown" ml="default">
							Show countdown box
						</Label>
						<Text variant="sm" color="grey60" mt="sm">
							When enabled, the event countdown / count-up card appears on the listing detail page (next to the poster).
						</Text>
					</Box>

					<Box
						mt="xl"
						p="lg"
						borderRadius="lg"
						style={{
							background:
								"#fff",
							border: "1px solid rgba(0,0,0,0.06)",
						}}
					>
						<Label mb="sm">
							Publishing
							schedule
						</Label>
						<Text
							variant="sm"
							color="grey60"
							mb="lg"
						>
							Optional
							dates
							to
							control
							when
							this
							listing
							appears
							on
							the
							public
							site.
						</Text>
						<Box
							display="grid"
							style={{
								gridTemplateColumns:
									"repeat(auto-fit, minmax(240px, 1fr))",
								gap: 20,
							}}
						>
							<ListingPublishDate
								property={
									publishAtProperty
								}
								record={
									record
								}
								onChange={
									handleListingFieldChange
								}
							/>
							<ListingUnpublishDate
								property={
									unpublishAtProperty
								}
								record={
									record
								}
								onChange={
									handleListingFieldChange
								}
							/>
						</Box>
					</Box>

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
						color="grey60"
						mb="xl"
					>
						Upload banner images and gallery photos. Drag and drop files or click each zone to browse.
					</Text>

					<Box
						display="grid"
						style={{
							gridTemplateColumns:
								"repeat(auto-fit, minmax(280px, 1fr))",
							gap: 24,
						}}
					>
						<Box
							p="lg"
							borderRadius="lg"
							style={{
								background:
									"#fff",
								border: "1px solid rgba(0,0,0,0.06)",
							}}
						>
							<ImageDropzone
								label="Banner image"
								hint="Used on listing cards. Max 4MB."
								previewUrl={toListingMediaUrl(
									record
										?.params
										?.banner_image,
								)}
								previewAlt="Banner"
								previewAspect="16 / 9"
								uploading={
									bannerUploading
								}
								onFiles={
									onUploadBanner
								}
								onClear={
									record
										?.params
										?.banner_image
										? () =>
												handlePropertyChange(
													"banner_image",
													"",
												)
										: undefined
								}
								emptyTitle="Drop banner image"
								emptySubtitle="JPEG, PNG, or WebP"
							/>
						</Box>

						<Box
							p="lg"
							borderRadius="lg"
							style={{
								background:
									"#fff",
								border: "1px solid rgba(0,0,0,0.06)",
							}}
						>
							<ImageDropzone
								label="Detail page banner (wide)"
								hint="Hero image on the listing detail page. Max 4MB."
								previewUrl={toListingMediaUrl(
									record
										?.params
										?.detail_banner_image,
								)}
								previewAlt="Detail banner"
								previewAspect="21 / 9"
								uploading={
									bannerUploading
								}
								onFiles={
									onUploadDetailBanner
								}
								onClear={
									record
										?.params
										?.detail_banner_image
										? () =>
												handlePropertyChange(
													"detail_banner_image",
													"",
												)
										: undefined
								}
								emptyTitle="Drop detail banner"
								emptySubtitle="Wide format works best"
							/>
						</Box>
					</Box>

					<Box
						mt="xl"
						p="lg"
						borderRadius="lg"
						style={{
							background: "#fff",
							border: "1px solid rgba(0,0,0,0.06)",
						}}
					>
						<Label mb="sm">Sponsor banner</Label>
						<Text variant="sm" color="grey60" mb="lg">
							Shown at the top of the listing detail right column. Optional link opens in a new tab.
						</Text>
						<Box
							display="grid"
							style={{
								gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
								gap: 20,
								alignItems: "start",
							}}
						>
							<ImageDropzone
								label="Sponsor banner image"
								hint="Max 4MB. Recommended wide or square ad format."
								previewUrl={toListingMediaUrl(
									record?.params?.sponsor_banner_image,
								)}
								previewAlt="Sponsor banner"
								previewAspect="16 / 9"
								uploading={bannerUploading}
								onFiles={onUploadSponsorBanner}
								onClear={
									record?.params?.sponsor_banner_image
										? () =>
												handlePropertyChange(
													"sponsor_banner_image",
													"",
												)
										: undefined
								}
								emptyTitle="Drop sponsor banner"
								emptySubtitle="JPEG, PNG, or WebP"
							/>
							<Box>
								<Label htmlFor="sponsor-banner-url">Sponsor link (optional)</Label>
								<Input
									id="sponsor-banner-url"
									value={record?.params?.sponsor_banner_url || ""}
									onChange={(e) =>
										handlePropertyChange("sponsor_banner_url", e.target.value)
									}
									placeholder="https://example.com"
									style={{ width: "100%", marginTop: 8 }}
								/>
								<Text variant="sm" color="grey60" mt="sm">
									If set, clicking the banner opens this URL in a new tab.
								</Text>
							</Box>
						</Box>
					</Box>

					<Box
						mt="xl"
						p="lg"
						borderRadius="lg"
						style={{
							background:
								"#fff",
							border: "1px solid rgba(0,0,0,0.06)",
						}}
					>
						<Label>
							Trailer URL
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

					<Box
						mt="xl"
						p="lg"
						borderRadius="lg"
						style={{
							background:
								"#fff",
							border: "1px solid rgba(0,0,0,0.06)",
						}}
					>
						<Box
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							flexWrap="wrap"
							style={{
								gap: 12,
							}}
							mb="md"
						>
							<Label mb="0">
								Gallery images
							</Label>
							<Text
								variant="sm"
								color="grey60"
							>
								{
									galleryImages.length
								}
								/10
								{isUploading
									? " · uploading…"
									: ""}
							</Text>
						</Box>

						<ImageDropzone
							hint="Add up to 10 images, 4MB each. Drop multiple files at once."
							multiple
							compact
							uploading={
								isUploading
							}
							disabled={
								galleryImages.length >=
								10
							}
							onFiles={
								processGalleryFiles
							}
							emptyTitle="Drop gallery images here"
							emptySubtitle="or click to select files"
						/>

						{galleryImages.length ? (
							<Box
								mt="lg"
								display="grid"
								style={{
									gridTemplateColumns:
										"repeat(auto-fill, minmax(140px, 1fr))",
									gap: 12,
								}}
							>
								{galleryImages.map(
									(
										g,
										idx,
									) => (
										<Box
											key={`${g.image_path}-${idx}`}
											borderRadius="lg"
											overflow="hidden"
											style={{
												position:
													"relative",
												border: "1px solid rgba(0,0,0,0.08)",
												background:
													"#fafafa",
											}}
										>
											<Box
												style={{
													aspectRatio:
														"4 / 3",
													background:
														"#f4f4f5",
												}}
											>
												<Box
													as="img"
													src={
														g.publicUrl ||
														toListingMediaUrl(
															g.image_path,
														)
													}
													alt={`Gallery ${idx + 1}`}
													style={{
														width: "100%",
														height: "100%",
														objectFit:
															"cover",
														display:
															"block",
													}}
												/>
											</Box>
											<Box
												p="sm"
												display="flex"
												justifyContent="space-between"
												alignItems="center"
												style={{
													gap: 8,
												}}
											>
												<Text
													variant="sm"
													color="grey60"
												>
													#
													{idx +
														1}
												</Text>
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
						.length >
					0 ? (
						<Box
							mt="lg"
							maxWidth={480}
						>
							<Label>
								Quick
								search
								shows
							</Label>
							<Input
								value={
									showsSearch
								}
								onChange={(
									e,
								) =>
									setShowsSearch(
										e
											.target
											.value,
									)
								}
								placeholder="Search by place, date, show #…"
							/>
							{showsSearch.trim() ? (
								<Text
									variant="sm"
									color="grey60"
									mt="sm"
								>
									Showing{" "}
									{
										filteredShows.length
									}{" "}
									of{" "}
									{(
										showsPayload?.shows ||
										[]
									)
										.length}{" "}
									shows
								</Text>
							) : null}
						</Box>
					) : null}

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
					) : filteredShows.length ===
					  0 ? (
						<Box mt="xl">
							<Text>
								No
								shows
								match
								your
								search.
							</Text>
						</Box>
					) : null}

					{filteredShows.map(
						({
							s,
							showIdx,
						}) => {
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
							const placeTitle =
								showPlaceLabel(
									s,
									placeOptions,
								);
							const dateTitle =
								showDateLabel(
									s,
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
										<Box>
											<H2
												style={{
													margin: 0,
													fontSize: 18,
													lineHeight: 1.35,
												}}
											>
												{`Show #${showIdx + 1} - ${placeTitle} · ${dateTitle}`}
											</H2>
										</Box>
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
													<ModernDatePicker
														value={
															s.start_date
														}
														maxDate={parseShowBoundaryDate(
															s.end_date,
														)}
														placeholder="Start date"
														onChange={(
															sql,
														) =>
															updateShow(
																showIdx,
																"start_date",
																sql
																	? sql.slice(
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
													<ModernDatePicker
														value={
															s.end_date
														}
														minDate={parseShowBoundaryDate(
															s.start_date,
														)}
														placeholder="End date"
														onChange={(
															sql,
														) =>
															updateShow(
																showIdx,
																"end_date",
																sql
																	? sql.slice(
																			0,
																			10,
																		)
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
																<ModernTimePicker
																	value={
																		t.show_time
																	}
																	placeholder="Show time"
																	onChange={(
																		time,
																	) => {
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
			</FormSaveChrome>

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

		</Box>
	);
}
